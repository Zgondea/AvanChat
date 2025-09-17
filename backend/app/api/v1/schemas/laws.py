from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional
from datetime import datetime

class LawCreate(BaseModel):
    title: str

class LawRead(BaseModel):
    id: UUID
    title: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        
        
class LawVersionCreate(BaseModel):
    version_no: int
    document_id: Optional[UUID] = None


class LawVersionRead(BaseModel):
    id: UUID
    law_id: UUID
    version_no: int
    document_id: Optional[UUID] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LawSectionRead(BaseModel):
    id: UUID
    version_id: UUID
    section_key: str
    raw_text: str
    ord: Optional[int] = None

    class Config:
        from_attributes = True

from typing import List, Literal, Optional
from pydantic import BaseModel

class DiffOp(BaseModel):
    type: Literal["equal", "ins", "del"]
    text: str

class SectionDiffRead(BaseModel):
    section_key: str
    from_version: int
    to_version: int
    mode: Literal["inline", "side"]
    ops: List[DiffOp]
    meta: Optional[dict] = None

    class Config:
        from_attributes = True


class ModifiedItem(BaseModel):
    section_key: str
    from_len: int
    to_len: int
    change_pct: float  # ex. 12.34

class CompareSummary(BaseModel):
    sections_from: int
    sections_to: int
    added_count: int
    removed_count: int
    modified_count: int
    changed_pct: float  

class CompareResultRich(BaseModel):
    from_version: int
    to_version: int
    added: List[str]
    removed: List[str]
    modified: List[ModifiedItem]
    summary: CompareSummary


# Search schemas
class SearchFilters(BaseModel):
    search_term: Optional[str] = None
    modification_type: Optional[str] = "all"  # all, added, removed, modified

class FilteredSection(BaseModel):
    section_key: str
    status: str  # added, removed, modified
    raw_text: Optional[str] = None
    from_content: Optional[str] = None
    to_content: Optional[str] = None
    match_reason: Optional[str] = None