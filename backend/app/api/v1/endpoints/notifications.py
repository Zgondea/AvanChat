from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.models.favorites import LawNotification
from app.models.laws import Law
from app.api.v1.schemas.favorites import (
    NotificationRead, NotificationUpdate, NotificationCreate
)

router = APIRouter()


@router.get("/", response_model=List[NotificationRead])
async def get_notifications(
    user_id: str = Query(..., description="User ID or session ID"),
    unread_only: bool = Query(False, description="Show only unread notifications"),
    limit: int = Query(20, description="Number of notifications to return"),
    offset: int = Query(0, description="Offset for pagination"),
    db: AsyncSession = Depends(get_db)
):
    """Obține notificările pentru un utilizator"""
    
    query = select(LawNotification, Law).join(Law).where(
        LawNotification.user_id == user_id
    )
    
    if unread_only:
        query = query.where(LawNotification.is_read == False)
    
    query = query.order_by(LawNotification.created_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    notifications_with_laws = result.all()
    
    notifications_list = []
    for notification, law in notifications_with_laws:
        notifications_list.append(NotificationRead(
            id=notification.id,
            user_id=notification.user_id,
            law_id=notification.law_id,
            notification_type=notification.notification_type,
            message=notification.message,
            is_read=notification.is_read,
            created_at=notification.created_at,
            version_from=notification.version_from,
            version_to=notification.version_to,
            change_summary=notification.change_summary,
            law_title=law.title
        ))
    
    return notifications_list


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: UUID,
    user_id: str = Query(..., description="User ID or session ID"),
    db: AsyncSession = Depends(get_db)
):
    """Marchează o notificare ca citită"""
    
    update_query = update(LawNotification).where(
        LawNotification.id == notification_id,
        LawNotification.user_id == user_id
    ).values(is_read=True)
    
    result = await db.execute(update_query)
    await db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )
    
    return {"message": "Notification marked as read"}


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    user_id: str = Query(..., description="User ID or session ID"),
    db: AsyncSession = Depends(get_db)
):
    """Marchează toate notificările ca citite"""
    
    update_query = update(LawNotification).where(
        LawNotification.user_id == user_id,
        LawNotification.is_read == False
    ).values(is_read=True)
    
    result = await db.execute(update_query)
    await db.commit()
    
    return {"message": f"Marked {result.rowcount} notifications as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    user_id: str = Query(..., description="User ID or session ID"),
    db: AsyncSession = Depends(get_db)
):
    """Șterge o notificare"""
    
    delete_query = delete(LawNotification).where(
        LawNotification.id == notification_id,
        LawNotification.user_id == user_id
    )
    
    result = await db.execute(delete_query)
    await db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )
    
    return {"message": "Notification deleted successfully"}


@router.get("/count")
async def get_notifications_count(
    user_id: str = Query(..., description="User ID or session ID"),
    unread_only: bool = Query(True, description="Count only unread notifications"),
    db: AsyncSession = Depends(get_db)
):
    """Obține numărul de notificări"""
    
    query = select(func.count(LawNotification.id)).where(
        LawNotification.user_id == user_id
    )
    
    if unread_only:
        query = query.where(LawNotification.is_read == False)
    
    result = await db.execute(query)
    count = result.scalar() or 0
    
    return {"count": count}


@router.post("/", response_model=NotificationRead, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    db: AsyncSession = Depends(get_db)
):
    """Creează o notificare nouă (folosit de background service)"""
    
    # Verifică dacă legea există
    law_query = select(Law).where(Law.id == notification_data.law_id)
    law_result = await db.execute(law_query)
    law = law_result.scalar_one_or_none()
    
    if not law:
        raise HTTPException(
            status_code=404,
            detail="Law not found"
        )
    
    # Creează notificarea
    notification = LawNotification(
        user_id=notification_data.user_id,
        law_id=notification_data.law_id,
        notification_type=notification_data.notification_type,
        message=notification_data.message,
        version_from=notification_data.version_from,
        version_to=notification_data.version_to,
        change_summary=notification_data.change_summary
    )
    
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    
    return NotificationRead(
        id=notification.id,
        user_id=notification.user_id,
        law_id=notification.law_id,
        notification_type=notification.notification_type,
        message=notification.message,
        is_read=notification.is_read,
        created_at=notification.created_at,
        version_from=notification.version_from,
        version_to=notification.version_to,
        change_summary=notification.change_summary,
        law_title=law.title
    )