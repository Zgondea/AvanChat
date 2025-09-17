from __future__ import annotations
from typing import List, Tuple, Dict, Any
from uuid import UUID
import re
import difflib
from sqlalchemy.orm import Session
from app.models.laws import LawSection, LawVersion

WORD_SPLIT_RE = re.compile(r"(\s+|[^\w\s]+)")

def _tokenize(text: str) -> List[str]:
    if not text:
        return []
    parts = [p for p in WORD_SPLIT_RE.split(text) if p != ""]
    return parts

def diff_text(a: str, b: str, mode: str = "inline") -> Dict[str, Any]:
    a_tokens = _tokenize(a)
    b_tokens = _tokenize(b)

    sm = difflib.SequenceMatcher(a=a_tokens, b=b_tokens)
    ops: List[Dict[str, str]] = []
    
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            ops.append({"type": "equal", "text": "".join(a_tokens[i1:i2])})
        elif tag == "insert":
            ops.append({"type": "ins", "text": "".join(b_tokens[j1:j2])})
        elif tag == "delete":
            ops.append({"type": "del", "text": "".join(a_tokens[i1:i2])})
        elif tag == "replace":
            # replace = delete + insert (ordinea asta ajută la randare)
            if i2 > i1:
                ops.append({"type": "del", "text": "".join(a_tokens[i1:i2])})
            if j2 > j1:
                ops.append({"type": "ins", "text": "".join(b_tokens[j1:j2])})
    return {"mode": mode, "ops": ops}

def _get_versions_by_no(db: Session, law_id: UUID, from_no: int, to_no: int) -> Tuple[LawVersion, LawVersion]:
    v_from = (
        db.query(LawVersion)
        .filter(LawVersion.law_id == law_id, LawVersion.version_no == from_no)
        .first()
    )
    v_to = (
        db.query(LawVersion)
        .filter(LawVersion.law_id == law_id, LawVersion.version_no == to_no)
        .first()
    )
    return v_from, v_to


def _get_section_text(db: Session, version_id: UUID, section_key: str) -> Tuple[str, str]:
    s = (
        db.query(LawSection)
        .filter(LawSection.version_id == version_id, LawSection.section_key == section_key)
        .first()
    )
    if not s:
        return "", ""
    return s.raw_text or "", (s.normalized_text or s.raw_text or "")


def section_diff(
    db: Session,
    law_id: UUID,
    from_no: int,
    to_no: int,
    section_key: str,
    mode: str = "inline",
    use_normalized: bool = True,
) -> Dict[str, Any]:
    v_from, v_to = _get_versions_by_no(db, law_id, from_no, to_no)
    if not v_from or not v_to:
        raise ValueError("One or both versions not found for given law & version numbers")

    raw_a, norm_a = _get_section_text(db, v_from.id, section_key)
    raw_b, norm_b = _get_section_text(db, v_to.id, section_key)

    a = (norm_a if use_normalized else raw_a) or ""
    b = (norm_b if use_normalized else raw_b) or ""

    diff_obj = diff_text(a, b, mode=mode)


    la, lb = len(a), len(b)
    change_pct = 0.0
    if max(la, lb) > 0:
        change_pct = round(abs(lb - la) * 100.0 / max(la, lb), 2)

    diff_obj.update({
        "section_key": section_key,
        "from_version": from_no,
        "to_version": to_no,
        "meta": {"from_len": la, "to_len": lb, "change_pct": change_pct},
    })
    return diff_obj