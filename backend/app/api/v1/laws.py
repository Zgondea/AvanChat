from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Body, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, exists
from app.core.database import get_db
from app.models.laws import Law, LawVersion, LawSection
from app.api.v1.schemas.laws import (
    LawCreate, LawRead,
    LawVersionCreate, LawVersionRead,
    LawSectionRead, SectionDiffRead,
    CompareResultRich, ModifiedItem, CompareSummary,
    SearchFilters, FilteredSection
)
from app.services.laws_diff import section_diff
from app.services.laws_service import segment_sections, save_sections
from app.services.document_processor import DocumentProcessor
import os
import tempfile

router = APIRouter()

# -----------------------
# Laws
# -----------------------
@router.post("/", response_model=LawRead, status_code=status.HTTP_201_CREATED)
async def create_law(law_in: LawCreate, db: AsyncSession = Depends(get_db)):
    law = Law(title=law_in.title)
    db.add(law)
    await db.commit()
    await db.refresh(law)
    return law

@router.get("/", response_model=list[LawRead])
async def list_laws(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Law).order_by(Law.created_at.desc()))
    return result.scalars().all()

# -----------------------
# Law Versions
# -----------------------
@router.post("/{law_id}/versions", response_model=LawVersionRead, status_code=status.HTTP_201_CREATED)
async def create_version(law_id: UUID, version_in: LawVersionCreate, db: AsyncSession = Depends(get_db)):
    # 404 dacă legea nu există
    law_exists_result = await db.execute(select(exists().where(Law.id == law_id)))
    law_exists = law_exists_result.scalar()
    if not law_exists:
        raise HTTPException(status_code=404, detail="Law not found")

    # 409 dacă există deja același version_no la aceeași lege
    dup_result = await db.execute(
        select(exists().where(
            (LawVersion.law_id == law_id) &
            (LawVersion.version_no == version_in.version_no)
        ))
    )
    dup = dup_result.scalar()
    if dup:
        raise HTTPException(status_code=409, detail="Version already exists for this law")

    version = LawVersion(
        law_id=law_id,
        version_no=version_in.version_no,
        document_id=version_in.document_id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version

@router.get("/{law_id}/versions", response_model=list[LawVersionRead])
async def list_versions(law_id: UUID, db: AsyncSession = Depends(get_db)):
    # 404 dacă legea nu există
    law_exists_result = await db.execute(select(exists().where(Law.id == law_id)))
    law_exists = law_exists_result.scalar()
    if not law_exists:
        raise HTTPException(status_code=404, detail="Law not found")

    result = await db.execute(
        select(LawVersion)
        .filter(LawVersion.law_id == law_id)
        .order_by(LawVersion.version_no.desc())
    )
    return result.scalars().all()

# -----------------------
# Sections (list)
# -----------------------
@router.get(
    "/{law_id}/versions/{version_id}/sections",
    response_model=list[LawSectionRead]
)
async def list_sections(law_id: UUID, version_id: UUID, db: AsyncSession = Depends(get_db)):
    # 404 dacă legea nu există
    law_exists_result = await db.execute(select(exists().where(Law.id == law_id)))
    law_exists = law_exists_result.scalar()
    if not law_exists:
        raise HTTPException(status_code=404, detail="Law not found")

    # 404 dacă versiunea nu există sau nu aparține legii
    version_result = await db.execute(select(LawVersion).filter(LawVersion.id == version_id))
    version = version_result.scalar_one_or_none()
    if not version or version.law_id != law_id:
        raise HTTPException(status_code=404, detail="Version not found for this law")

    # listează secțiunile ordonate
    sections_result = await db.execute(
        select(LawSection)
        .filter(LawSection.version_id == version_id)
        .order_by(LawSection.ord.nulls_last(), LawSection.section_key.asc())
    )
    return sections_result.scalars().all()

@router.get("/{law_id}/compare", response_model=CompareResultRich)
async def compare_versions(
    law_id: UUID,
    from_: int = Query(..., alias="from"),
    to: int = Query(...),
    db: AsyncSession = Depends(get_db)
):
    # Get version from
    v_from_result = await db.execute(
        select(LawVersion)
        .filter(LawVersion.law_id == law_id, LawVersion.version_no == from_)
    )
    v_from = v_from_result.scalar_one_or_none()
    
    # Get version to
    v_to_result = await db.execute(
        select(LawVersion)
        .filter(LawVersion.law_id == law_id, LawVersion.version_no == to)
    )
    v_to = v_to_result.scalar_one_or_none()
    
    if not v_from or not v_to:
        raise HTTPException(status_code=404, detail="One of the versions not found for this law")
    
    # Get sections for both versions
    s_from_result = await db.execute(select(LawSection).filter(LawSection.version_id == v_from.id))
    s_from = s_from_result.scalars().all()
    
    s_to_result = await db.execute(select(LawSection).filter(LawSection.version_id == v_to.id))
    s_to = s_to_result.scalars().all()

    map_from = {s.section_key: (s.raw_text, s.normalized_text) for s in s_from}
    map_to = {s.section_key: (s.raw_text, s.normalized_text) for s in s_to}

    keys_from, keys_to = set(map_from), set(map_to)
    added = sorted(keys_to - keys_from)
    removed = sorted(keys_from - keys_to)

    modified = []
    for k in sorted(keys_from & keys_to):
        a = map_from[k][1] or map_from[k][0]
        b = map_to[k][1] or map_to[k][0]
        if a != b:
            # Calculate detailed info for modified sections
            a_len = len(a)
            b_len = len(b)
            change_pct = 0.0
            if max(a_len, b_len) > 0:
                change_pct = round(abs(b_len - a_len) * 100.0 / max(a_len, b_len), 2)
            
            modified.append(ModifiedItem(
                section_key=k,
                from_len=a_len,
                to_len=b_len,
                change_pct=change_pct
            ))

    # Calculate summary
    sections_from = len(s_from)
    sections_to = len(s_to)
    total_changes = len(added) + len(removed) + len(modified)
    total_sections = max(sections_from, sections_to)
    changed_pct = 0.0
    if total_sections > 0:
        changed_pct = round(total_changes * 100.0 / total_sections, 2)

    summary = CompareSummary(
        sections_from=sections_from,
        sections_to=sections_to,
        added_count=len(added),
        removed_count=len(removed),
        modified_count=len(modified),
        changed_pct=changed_pct
    )

    return CompareResultRich(
        from_version=from_,
        to_version=to,
        added=added,
        removed=removed,
        modified=modified,
        summary=summary
    )


@router.post("/{law_id}/search", response_model=List[FilteredSection])
async def search_law_differences(
    law_id: UUID,
    from_: int = Query(..., alias="from"),
    to: int = Query(...),
    filters: SearchFilters = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Advanced search and filtering for law differences
    """
    # Get versions
    v_from_result = await db.execute(
        select(LawVersion)
        .filter(LawVersion.law_id == law_id, LawVersion.version_no == from_)
    )
    version_from = v_from_result.scalar_one_or_none()
    if not version_from:
        raise HTTPException(status_code=404, detail=f"Version {from_} not found")

    v_to_result = await db.execute(
        select(LawVersion)
        .filter(LawVersion.law_id == law_id, LawVersion.version_no == to)
    )
    version_to = v_to_result.scalar_one_or_none()
    if not version_to:
        raise HTTPException(status_code=404, detail=f"Version {to} not found")

    # Get sections
    sections_from_result = await db.execute(
        select(LawSection)
        .filter(LawSection.version_id == version_from.id)
        .order_by(LawSection.ord.nulls_last(), LawSection.section_key)
    )
    sections_from = {s.section_key: s for s in sections_from_result.scalars().all()}

    sections_to_result = await db.execute(
        select(LawSection)
        .filter(LawSection.version_id == version_to.id)
        .order_by(LawSection.ord.nulls_last(), LawSection.section_key)
    )
    sections_to = {s.section_key: s for s in sections_to_result.scalars().all()}

    # Create differences and apply filters
    results = []
    all_keys = set(sections_from.keys()) | set(sections_to.keys())
    
    for key in sorted(all_keys):
        from_section = sections_from.get(key)
        to_section = sections_to.get(key)
        
        # Determine status
        if not from_section and to_section:
            status = "added"
            raw_text = to_section.raw_text
        elif from_section and not to_section:
            status = "removed"
            raw_text = from_section.raw_text
        elif from_section.raw_text != to_section.raw_text:
            status = "modified"
            raw_text = to_section.raw_text
        else:
            continue  # Skip unchanged sections
        
        # Filter by modification type
        if filters.modification_type != "all" and status != filters.modification_type:
            continue
        
        # Filter by search term
        if filters.search_term:
            search_term_lower = filters.search_term.lower()
            key_matches = search_term_lower in key.lower()
            from_matches = from_section and search_term_lower in (from_section.raw_text or "").lower()
            to_matches = to_section and search_term_lower in (to_section.raw_text or "").lower()
            
            if not (key_matches or from_matches or to_matches):
                continue
        
        # Create result
        result = FilteredSection(
            section_key=key,
            status=status,
            raw_text=raw_text,
            from_content=from_section.raw_text if from_section else None,
            to_content=to_section.raw_text if to_section else None
        )
        results.append(result)
    
    return results




# Note: Section diff endpoint needs sync session for now since laws_diff uses sync
@router.get(
    "/{law_id}/sections/{section_key}/diff"
)
async def get_section_diff(
    law_id: UUID,
    section_key: str,
    from_: int = Query(..., alias="from"),
    to: int = Query(...),
    mode: str = Query("inline", pattern="^(inline|side)$"),
    db: AsyncSession = Depends(get_db),
):
    """
    Diff detaliat pentru o secțiune (Art. X) între două versiuni ale aceleiași legi.
    Note: This endpoint temporarily returns raw dict format due to sync/async mismatch.
    """
    # Note: We need to create a sync session for the diff service
    # This is a temporary solution until laws_diff is converted to async
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import create_engine
    from app.core.config import settings
    
    # Create sync engine and session
    sync_engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    SessionLocal = sessionmaker(bind=sync_engine)
    sync_db = SessionLocal()
    
    try:
        result = section_diff(
            db=sync_db,
            law_id=law_id,
            from_no=from_,
            to_no=to,
            section_key=section_key,
            mode=mode,
            use_normalized=True,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    finally:
        sync_db.close()

# -----------------------
# Upload & Processing
# -----------------------
@router.post("/{law_id}/versions/{version_no}/upload", response_model=dict)
async def upload_law_version(
    law_id: UUID,
    version_no: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a document for a law version and automatically segment into sections
    """
    # Verify law exists
    law_exists_result = await db.execute(select(exists().where(Law.id == law_id)))
    if not law_exists_result.scalar():
        raise HTTPException(status_code=404, detail="Law not found")
    
    # Check if version already exists
    existing_version = await db.execute(
        select(LawVersion).filter(
            LawVersion.law_id == law_id,
            LawVersion.version_no == version_no
        )
    )
    version = existing_version.scalar_one_or_none()
    
    if not version:
        # Create new version
        version = LawVersion(
            law_id=law_id,
            version_no=version_no,
            document_id=None,
        )
        db.add(version)
        await db.commit()
        await db.refresh(version)
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Process document to extract text
            processor = DocumentProcessor()
            extracted_text = await processor.extract_text_from_file(tmp_file_path, file.content_type)
            
            if not extracted_text:
                raise HTTPException(status_code=400, detail="Could not extract text from document")
            
            # Segment the text into sections
            sections = segment_sections(extracted_text)
            
            if not sections:
                raise HTTPException(status_code=400, detail="No sections found in document")
            
            # Create a sync session for save_sections (temporary solution)
            from sqlalchemy.orm import sessionmaker
            from sqlalchemy import create_engine
            from app.core.config import settings
            
            sync_engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", "+psycopg2"))
            SessionLocal = sessionmaker(bind=sync_engine)
            sync_db = SessionLocal()
            
            try:
                # Save sections to database
                sections_count = save_sections(sync_db, version.id, sections)
                
                return {
                    "message": "Law version uploaded and processed successfully",
                    "law_id": str(law_id),
                    "version_no": version_no,
                    "version_id": str(version.id),
                    "sections_count": sections_count,
                    "sections_preview": [{"section_key": k, "text_preview": v[:100] + "..."} for k, v in sections[:3]]
                }
                
            finally:
                sync_db.close()
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@router.post("/upload-new", response_model=dict)
async def upload_new_law(
    title: str = Body(...),
    version_no: int = Body(1),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a new law with its first version
    """
    # Create new law
    law = Law(title=title)
    db.add(law)
    await db.commit()
    await db.refresh(law)
    
    # Use the existing upload endpoint logic
    return await upload_law_version(law.id, version_no, file, db)