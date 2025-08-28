from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from pgvector.sqlalchemy import Vector
from .database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    municipality_id = Column(UUID(as_uuid=True), ForeignKey("municipalities.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=True)
    source_url = Column(Text, nullable=True)
    source_type = Column(String(50), default='file')
    file_size = Column(BigInteger)
    mime_type = Column(String(100))
    category = Column(String(100), default='fiscal')
    title = Column(String(500))
    description = Column(Text)
    priority = Column(Integer, default=1)
    version_year = Column(Integer, nullable=True)
    is_processed = Column(Boolean, default=False)
    processed_at = Column(DateTime)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    municipalities = relationship("MunicipalityDocument", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    municipality_id = Column(UUID(as_uuid=True), ForeignKey("municipalities.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(384))
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer)
    chunk_metadata = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document", back_populates="chunks")