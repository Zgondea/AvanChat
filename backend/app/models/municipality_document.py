from sqlalchemy import Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base

class MunicipalityDocument(Base):
    __tablename__ = "municipality_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    municipality_id = Column(UUID(as_uuid=True), ForeignKey("municipalities.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"))
    
    # Relationships
    municipality = relationship("Municipality", back_populates="documents")
    document = relationship("Document", back_populates="municipalities")