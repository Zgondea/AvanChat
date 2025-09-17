from __future__ import annotations
import re
from typing import List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.laws import LawSection

def normalize_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"{ \t}+"," ", text)
    return text.strip()

ART_RE = re.compile(r"(?m)^\s*(Art\.?\s*\d+[A-Za-z0-9^]*)\s*(.*)$")

def segment_sections(text: str) -> List[Tuple[str, str]]:
    if not text:
        return []
    lines = text.split("\n")
    sections: List[Tuple[str, str]] = []
    current_key = None
    buffer: list[str] = []

    def flush():
        nonlocal sections, current_key, buffer
        if current_key is not None:
            raw = "\n".join(buffer).strip()
            sections.append((current_key, raw))
        buffer = []
    
    for ln in lines:
        m =  ART_RE.match(ln)
        if m:
            flush()
            current_key = m.group(1).strip()
            tail = m.group(2).strip()
            buffer = [tail] if tail else []
        else:
            buffer.append(ln)
    flush()
    
    sections = [(k, v) for (k, v) in sections if k and v]
    return sections


def save_sections(db: Session, version_id: UUID, sections: List[Tuple[str, str]]) -> int:
    db.query(LawSection).filter(LawSection.version_id == version_id).delete()
    ord_idx = 1
    for key, raw in sections: 
        db.add(LawSection(
            version_id=version_id,
            section_key=key,
            raw_text=raw,
            normalized_text=normalize_text(raw),
            ord=ord_idx
        ))
        ord_idx += 1
    db.commit()
    return len(sections)