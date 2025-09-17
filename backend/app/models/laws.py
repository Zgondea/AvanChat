from sqlalchemy import Column, ForeignKey, DateTime, String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base


class Law(Base):
    __tablename__ = "laws"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String, nullable=False)  # ex: "Legea educației naționale"
    created_at = Column(DateTime, default=datetime.utcnow)

    # relații: o lege are mai multe versiuni, favorite, notificări
    versions = relationship("LawVersion", back_populates="law")
    favorites = relationship("UserFavoriteLaw", back_populates="law")
    notifications = relationship("LawNotification", back_populates="law")
    version_tracking = relationship("LawVersionTracking", back_populates="law", uselist=False)


class LawVersion(Base):
    __tablename__ = "law_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    law_id = Column(UUID(as_uuid=True), ForeignKey("laws.id"), nullable=False)
    version_no = Column(Integer, nullable=False)  # ex: 40, 80 etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("admin_users.id"), nullable=True)

    # relații
    law = relationship("Law", back_populates="versions")
    document = relationship("Document", back_populates="law_versions")

    # o versiune are mai multe secțiuni
    sections = relationship("LawSection", back_populates="version")


class LawSection(Base):
    __tablename__ = "law_sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    version_id = Column(UUID(as_uuid=True), ForeignKey("law_versions.id"), nullable=False)
    section_key = Column(String, nullable=False)  # ex: "Art. 10 alin. (2)"
    raw_text = Column(Text, nullable=False)
    normalized_text = Column(Text, nullable=True)
    ord = Column(Integer, nullable=True)  # ordinea în document

    version = relationship("LawVersion", back_populates="sections")
