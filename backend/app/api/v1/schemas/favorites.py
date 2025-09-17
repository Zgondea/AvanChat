from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional
from datetime import datetime


class FavoriteCreate(BaseModel):
    law_id: UUID
    user_id: str  # poate fi session_id pentru anonymous users


class FavoriteRead(BaseModel):
    id: UUID
    user_id: str
    law_id: UUID
    created_at: datetime
    
    # Include law details
    law_title: Optional[str] = None
    law_created_at: Optional[datetime] = None
    total_versions: Optional[int] = None
    latest_version: Optional[int] = None

    class Config:
        from_attributes = True


class NotificationRead(BaseModel):
    id: UUID
    user_id: str
    law_id: UUID
    notification_type: str
    message: str
    is_read: bool
    created_at: datetime
    version_from: Optional[int] = None
    version_to: Optional[int] = None
    change_summary: Optional[str] = None
    
    # Include law details
    law_title: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    user_id: str
    law_id: UUID
    notification_type: str
    message: str
    version_from: Optional[int] = None
    version_to: Optional[int] = None
    change_summary: Optional[str] = None


class NotificationUpdate(BaseModel):
    is_read: bool = True


class FavoritesStatsRead(BaseModel):
    total_favorites: int
    unread_notifications: int
    last_updated: Optional[datetime] = None