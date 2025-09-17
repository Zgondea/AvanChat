from sqlalchemy import Column, ForeignKey, DateTime, String, Boolean, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from .database import Base


class UserFavoriteLaw(Base):
    __tablename__ = "user_favorite_laws"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String, nullable=False, index=True)  # poate fi session_id pentru anonymous users
    law_id = Column(UUID(as_uuid=True), ForeignKey("laws.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relații
    law = relationship("Law", back_populates="favorites")


class LawNotification(Base):
    __tablename__ = "law_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String, nullable=False, index=True)
    law_id = Column(UUID(as_uuid=True), ForeignKey("laws.id"), nullable=False)
    notification_type = Column(String, nullable=False)  # 'new_version', 'content_change'
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Metadata pentru notificări
    version_from = Column(Integer, nullable=True)  # versiunea de la care s-a schimbat
    version_to = Column(Integer, nullable=True)    # versiunea la care s-a schimbat
    change_summary = Column(Text, nullable=True)   # sumar al schimbărilor

    # Relații
    law = relationship("Law", back_populates="notifications")


class LawVersionTracking(Base):
    __tablename__ = "law_version_tracking"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    law_id = Column(UUID(as_uuid=True), ForeignKey("laws.id"), nullable=False, unique=True)
    last_checked_version = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relații
    law = relationship("Law", back_populates="version_tracking")