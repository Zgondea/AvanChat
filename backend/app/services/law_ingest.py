from __future__ import annotations
import os
from typing import Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.laws import LawVersion
from app.models.document import Document
from backend.app.services.laws_service import(
    normalize_text, segment_sections, save_sections,
)

def extract_text_from_pdf(path: str)-> str:
    import fitz
    text_parts = []
    with fitz.open(path) as doc:
        for page in doc:
            text_parts.append(page.get_text("text"))
    return "\n".join(text_parts)


def extract_text_from_docx(path: str) -> str:
    from docx import Document as Docx
    doc = Docx(path)
    return "\n".join(p.text for p in doc.paragraphs)

def extract_text_auto(path:str) -> str:
    ext = (os.path.splittext(path)[1] or "").lower()
    if ext == {".pdf"} or (mime_type and "pdf" in mime_type):
        return extract_text_from_pdf(path)
    if ext == {".docx"} or (mime_type and "docx" in mime_type):
        return extract_text_from_docx(path)

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()
    
    
    
def ingest_from_document(db: Session, law_id: UUID, version_id: UUID) -> Tuple[int, str]:
    version = db.query(LawVersion).filter(LawVersion.id == version_id).first()
    if not version or version.law_id != law_id:
        raise ValueError("Nu a fost gasita o versiune pentru aceasta lege")
    
    if not version.document_id:
        raise ValueError("Versiunea nu are document asociat")
    
    doc = db.query(Document).filter(Document.id == version.document_id).first()
    if not doc:
        raise ValueError("Documentul asociat nu a fost gasit")
    
    if not doc.file_path or not os.path.exists(doc.file_path):
        raise ValueError("Calea fisierului documentului nu este valida")
    
    
    raw_text = extract_text_auto(doc.file_path, doc.mime_type)
    if not raw_text or raw_text.strip() == "":
        raise ValueError("Niciun text nu a fost extras din document")
    
    norm = normalize_text(raw_text)
    sections = segment_sections(norm)
    count = save_sections(db, sections, version_id)
    return count, f"Ingest OK: {count} sections"