from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi import status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import logging
import os
import aiofiles
from pathlib import Path
import asyncio

from app.core.database import get_db
from app.core.config import settings
from app.models.municipality import Municipality
from app.models.document import Document, DocumentChunk
from app.models.municipality_document import MunicipalityDocument
from app.services.document_processor import DocumentProcessor
from app.services.embedding_service import EmbeddingService
# from backend.app.services import embedding_service # This import seems redundant and potentially problematic

logger = logging.getLogger(__name__)
router = APIRouter()

class DocumentResponse(BaseModel):
    id: str
    municipality_id: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    category: str
    title: str
    description: Optional[str]
    is_processed: bool
    processed_at: Optional[str]
    created_at: str
    chunk_count: int

class DocumentUploadResponse(BaseModel):
    message: str
    document_id: str
    filename: str
    processing_started: bool

class BulkAssignRequest(BaseModel):
    document_ids: List[str]
    municipality_ids: List[str]

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    municipality_id: Optional[str] = None,
    category: Optional[str] = None,
    processed_only: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List documents with optional filtering"""
    try:
        query = select(Document).options(selectinload(Document.chunks))

        # Filter by municipality
        if municipality_id:
            query = query.where(Document.municipality_id == municipality_id)

        # Filter by category
        if category:
            query = query.where(Document.category == category)

        # Filter by processing status
        if processed_only is not None:
            query = query.where(Document.is_processed == processed_only)

        # Add pagination
        query = query.offset(skip).limit(limit).order_by(Document.created_at.desc())

        result = await db.execute(query)
        documents = result.scalars().all()

        return [
            DocumentResponse(
                id=str(doc.id),
                municipality_id=str(doc.municipality_id),
                filename=doc.filename,
                original_filename=doc.original_filename,
                file_size=doc.file_size,
                mime_type=doc.mime_type,
                category=doc.category,
                title=doc.title,
                description=doc.description,
                is_processed=doc.is_processed,
                processed_at=doc.processed_at.isoformat() if doc.processed_at else None,
                created_at=doc.created_at.isoformat(),
                chunk_count=len(doc.chunks) if doc.chunks else 0
            )
            for doc in documents
        ]

    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    municipality_id: str = Form(...),
    category: str = Form(default="fiscal"),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Upload a document for processing"""
    # Initialize file_path to None, so it's always defined
    file_path = None
    try:
        # Validate municipality exists
        municipality_query = select(Municipality).where(Municipality.id == municipality_id)
        municipality_result = await db.execute(municipality_query)
        municipality = municipality_result.scalar_one_or_none()

        if not municipality:
            raise HTTPException(status_code=404, detail="Municipality not found")

        # Validate file format
        embedding_service_instance = EmbeddingService() # Renamed to avoid conflict
        processor = DocumentProcessor(embedding_service_instance)

        if not processor.validate_file_format(file.filename):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Supported formats: {processor.get_supported_formats()}"
            )

        # Validate file size
        if file.size and file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE} bytes"
            )

        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(settings.UPLOAD_DIRECTORY, unique_filename)

        # Ensure upload directory exists
        os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)

        # Save file to disk
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)

        # Create document record
        document = Document(
            municipality_id=municipality_id,
            filename=unique_filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=len(content),
            mime_type=file.content_type,
            category=category,
            title=title or file.filename,
            description=description
        )

        db.add(document)
        await db.commit()
        await db.refresh(document)

        # Start background processing
        background_tasks.add_task(
            process_document_background,
            str(document.id),
            file_path,
            str(municipality_id)
        )

        return DocumentUploadResponse(
            message="Document uploaded successfully. Processing started.",
            document_id=str(document.id),
            filename=file.filename,
            processing_started=True
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        # Clean up file if it was created
        if file_path and os.path.exists(file_path): # Check if file_path is not None before checking existence
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to upload document")

@router.post("/bulk-assign")
async def bulk_assign_documents(
    request: BulkAssignRequest,
    db: AsyncSession = Depends(get_db)
):
    """Assign multiple documents to multiple municipalities"""
    try:
        # Validate documents exist
        documents_query = select(Document).where(Document.id.in_(request.document_ids))
        documents_result = await db.execute(documents_query)
        documents = documents_result.scalars().all()

        if len(documents) != len(request.document_ids):
            # Find which documents were not found
            found_doc_ids = {str(doc.id) for doc in documents}
            missing_doc_ids = [doc_id for doc_id in request.document_ids if doc_id not in found_doc_ids]
            raise HTTPException(status_code=404, detail=f"Some documents not found: {missing_doc_ids}")

        # Validate municipalities exist
        municipalities_query = select(Municipality).where(Municipality.id.in_(request.municipality_ids))
        municipalities_result = await db.execute(municipalities_query)
        municipalities = municipalities_result.scalars().all()

        if len(municipalities) != len(request.municipality_ids):
            # Find which municipalities were not found
            found_municipality_ids = {str(muni.id) for muni in municipalities}
            missing_municipality_ids = [muni_id for muni_id in request.municipality_ids if muni_id not in found_municipality_ids]
            raise HTTPException(status_code=404, detail=f"Some municipalities not found: {missing_municipality_ids}")

        # Create assignments
        assignments_created = 0
        assignments_skipped = 0

        for doc_id in request.document_ids:
            for municipality_id in request.municipality_ids:
                # Check if assignment already exists
                existing_query = select(MunicipalityDocument).where(
                    and_(
                        MunicipalityDocument.document_id == doc_id,
                        MunicipalityDocument.municipality_id == municipality_id
                    )
                )
                existing_result = await db.execute(existing_query)

                if existing_result.scalar_one_or_none():
                    assignments_skipped += 1
                    continue

                # Create new assignment
                assignment = MunicipalityDocument(
                    document_id=doc_id,
                    municipality_id=municipality_id
                )
                db.add(assignment)
                assignments_created += 1

        await db.commit()

        return {
            "message": f"Bulk assignment completed. {assignments_created} assignments created, {assignments_skipped} already existed.",
            "assignments_created": assignments_created,
            "assignments_skipped": assignments_skipped
        }

    except HTTPException:
        await db.rollback() # Rollback in case of HTTPExceptions
        raise
    except Exception as e:
        logger.error(f"Error in bulk assignment: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to perform bulk assignment")

@router.get("/{document_id}")
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get document details"""
    try:
        query = select(Document).options(
            selectinload(Document.chunks),
            selectinload(Document.municipality)
        ).where(Document.id == document_id)

        result = await db.execute(query)
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        return {
            "id": str(document.id),
            "municipality": {
                "id": str(document.municipality.id),
                "name": document.municipality.name
            } if document.municipality else None, # Handle case where municipality might not be loaded
            "filename": document.filename,
            "original_filename": document.original_filename,
            "file_size": document.file_size,
            "mime_type": document.mime_type,
            "category": document.category,
            "title": document.title,
            "description": document.description,
            "is_processed": document.is_processed,
            "processed_at": document.processed_at.isoformat() if document.processed_at else None,
            "created_at": document.created_at.isoformat(),
            "chunk_count": len(document.chunks) if document.chunks else 0,
            "error_message": document.error_message # Include error_message if it exists
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve document")

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a document and its file"""
    try:
        query = select(Document).where(Document.id == document_id)
        result = await db.execute(query)
        document = result.scalar_one_or_none()

        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        # Delete file from disk
        if os.path.exists(document.file_path):
            os.remove(document.file_path)

        # Delete from database (cascades to chunks and assignments)
        await db.delete(document)
        await db.commit()

        return {"message": "Document deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete document")

@router.post("/process/{document_id}", status_code=200)
async def manual_process_document(
    document_id: str, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger processing for a document (repair/debug)"""
    try:
        document_query = select(Document).where(Document.id == document_id)
        document_result = await db.execute(document_query)
        document = document_result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
            
        if document.is_processed:
            return {"detail": "Document already processed", "document_id": document_id}
        
        # Reset error state
        document.error_message = None
        await db.commit()
        
        # Trigger background processing
        background_tasks.add_task(
            process_document_background,
            str(document.id),
            document.file_path,
            str(document.municipality_id)
        )
        
        return {"detail": "Processing triggered successfully", "document_id": document_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering manual process for document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/processing-status")
async def get_processing_status(db: AsyncSession = Depends(get_db)):
    """Get current processing status of all documents"""
    try:
        # Count documents by processing status
        total_query = select(func.count(Document.id))
        total_result = await db.execute(total_query)
        total_count = total_result.scalar()
        
        processed_query = select(func.count(Document.id)).where(Document.is_processed == True)
        processed_result = await db.execute(processed_query)
        processed_count = processed_result.scalar()
        
        failed_query = select(func.count(Document.id)).where(
            (Document.is_processed == False) & (Document.error_message.isnot(None))
        )
        failed_result = await db.execute(failed_query)
        failed_count = failed_result.scalar()
        
        processing_count = total_count - processed_count - failed_count
        
        # Get failed documents details
        failed_docs_query = select(Document).where(
            (Document.is_processed == False) & (Document.error_message.isnot(None))
        ).limit(10)
        failed_docs_result = await db.execute(failed_docs_query)
        failed_docs = failed_docs_result.scalars().all()
        
        return {
            "total_documents": total_count,
            "processed_documents": processed_count,
            "processing_documents": processing_count,
            "failed_documents": failed_count,
            "processing_percentage": round((processed_count / total_count) * 100, 2) if total_count > 0 else 0,
            "failed_document_details": [
                {
                    "id": str(doc.id),
                    "filename": doc.original_filename,
                    "error": doc.error_message[:200] + "..." if len(doc.error_message) > 200 else doc.error_message
                }
                for doc in failed_docs
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting processing status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get processing status")

from app.core.database import AsyncSessionLocal

async def process_document_background(document_id: str, file_path: str, municipality_id: str):
    """Background task to process document and generate embeddings"""
    logger.info(f"[PROCESS] Start processing document {document_id} for municipality {municipality_id} at {file_path}")
    db_session = AsyncSessionLocal() # Create a session for the background task
    try:
        embedding_service = EmbeddingService()
        await embedding_service.initialize()
        logger.info(f"[PROCESS] Embedding service initialized for document {document_id}")
        processor = DocumentProcessor(embedding_service)
        logger.info(f"[PROCESS] DocumentProcessor created for document {document_id}")
        chunks = await processor.process_document(file_path, document_id, municipality_id)
        logger.info(f"[PROCESS] Document {document_id} chunked: {len(chunks)} chunks")

        for chunk_data in chunks:
            chunk = DocumentChunk(
                document_id=chunk_data["document_id"],
                municipality_id=chunk_data["municipality_id"],
                content=chunk_data["content"],
                embedding=chunk_data["embedding"],
                chunk_index=chunk_data["chunk_index"],
                page_number=chunk_data["page_number"],
                chunk_metadata=chunk_data["chunk_metadata"]
            )
            db_session.add(chunk)
        logger.info(f"[PROCESS] Chunks added to DB session for document {document_id}")

        document_query = select(Document).where(Document.id == document_id)
        document_result = await db_session.execute(document_query)
        document = document_result.scalar_one_or_none()

        if document:
            document.is_processed = True
            document.processed_at = func.now()
            document.error_message = None # Clear any previous error message
            logger.info(f"[PROCESS] Document {document_id} marked as processed")

        await db_session.commit()
        logger.info(f"[PROCESS] DB commit complete for document {document_id}")
        await embedding_service.close()
        logger.info(f"Successfully processed document {document_id} with {len(chunks)} chunks")

    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {e}")
        # Mark document as not processed and store error message
        try:
            document_query = select(Document).where(Document.id == document_id)
            document_result = await db_session.execute(document_query)
            document = document_result.scalar_one_or_none()
            if document:
                document.is_processed = False
                document.error_message = str(e)
                logger.info(f"[PROCESS] Document {document_id} marked as failed: {e}")
            await db_session.commit()
        except Exception as rollback_e:
            logger.error(f"Error during rollback/error message update for document {document_id}: {rollback_e}")
            await db_session.rollback() # Ensure rollback if updating document fails
    finally:
        await db_session.close() # Always close the session
        logger.info(f"[PROCESS] DB session closed for document {document_id}")