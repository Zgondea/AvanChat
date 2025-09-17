from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.models.favorites import UserFavoriteLaw, LawNotification
from app.models.laws import Law, LawVersion
from app.api.v1.schemas.favorites import (
    FavoriteCreate, FavoriteRead, NotificationRead, NotificationUpdate,
    FavoritesStatsRead
)

router = APIRouter()


@router.post("/", response_model=FavoriteRead, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    favorite_data: FavoriteCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adaugă o lege la favorite"""
    
    # Verifică dacă legea există
    law_query = select(Law).where(Law.id == favorite_data.law_id)
    law_result = await db.execute(law_query)
    law = law_result.scalar_one_or_none()
    
    if not law:
        raise HTTPException(
            status_code=404,
            detail="Law not found"
        )
    
    # Verifică dacă nu e deja în favorite
    existing_query = select(UserFavoriteLaw).where(
        UserFavoriteLaw.user_id == favorite_data.user_id,
        UserFavoriteLaw.law_id == favorite_data.law_id
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Law already in favorites"
        )
    
    # Creează favoritul
    favorite = UserFavoriteLaw(
        user_id=favorite_data.user_id,
        law_id=favorite_data.law_id
    )
    
    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)
    
    # Returnează cu detalii despre lege
    versions_count_query = select(func.count(LawVersion.id)).where(LawVersion.law_id == law.id)
    versions_count_result = await db.execute(versions_count_query)
    total_versions = versions_count_result.scalar() or 0
    
    latest_version_query = select(func.max(LawVersion.version_no)).where(LawVersion.law_id == law.id)
    latest_version_result = await db.execute(latest_version_query)
    latest_version = latest_version_result.scalar() or 0
    
    return FavoriteRead(
        id=favorite.id,
        user_id=favorite.user_id,
        law_id=favorite.law_id,
        created_at=favorite.created_at,
        law_title=law.title,
        law_created_at=law.created_at,
        total_versions=total_versions,
        latest_version=latest_version
    )


@router.get("/", response_model=List[FavoriteRead])
async def get_favorites(
    user_id: str = Query(..., description="User ID or session ID"),
    db: AsyncSession = Depends(get_db)
):
    """Obține lista de favorite pentru un utilizator"""
    
    query = select(UserFavoriteLaw, Law).join(Law).where(
        UserFavoriteLaw.user_id == user_id
    ).order_by(UserFavoriteLaw.created_at.desc())
    
    result = await db.execute(query)
    favorites_with_laws = result.all()
    
    favorites_list = []
    for favorite, law in favorites_with_laws:
        # Obține statistici pentru fiecare lege
        versions_count_query = select(func.count(LawVersion.id)).where(LawVersion.law_id == law.id)
        versions_count_result = await db.execute(versions_count_query)
        total_versions = versions_count_result.scalar() or 0
        
        latest_version_query = select(func.max(LawVersion.version_no)).where(LawVersion.law_id == law.id)
        latest_version_result = await db.execute(latest_version_query)
        latest_version = latest_version_result.scalar() or 0
        
        favorites_list.append(FavoriteRead(
            id=favorite.id,
            user_id=favorite.user_id,
            law_id=favorite.law_id,
            created_at=favorite.created_at,
            law_title=law.title,
            law_created_at=law.created_at,
            total_versions=total_versions,
            latest_version=latest_version
        ))
    
    return favorites_list


@router.delete("/{law_id}")
async def remove_favorite(
    law_id: UUID,
    user_id: str = Query(..., description="User ID or session ID"),
    db: AsyncSession = Depends(get_db)
):
    """Elimină o lege din favorite"""
    
    delete_query = delete(UserFavoriteLaw).where(
        UserFavoriteLaw.user_id == user_id,
        UserFavoriteLaw.law_id == law_id
    )
    
    result = await db.execute(delete_query)
    await db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Favorite not found"
        )
    
    return {"message": "Favorite removed successfully"}


@router.get("/check/{law_id}")
async def check_favorite(
    law_id: UUID,
    user_id: str = Query(..., description="User ID or session ID"),
    db: AsyncSession = Depends(get_db)
):
    """Verifică dacă o lege este în favorite"""
    
    query = select(UserFavoriteLaw).where(
        UserFavoriteLaw.user_id == user_id,
        UserFavoriteLaw.law_id == law_id
    )
    
    result = await db.execute(query)
    favorite = result.scalar_one_or_none()
    
    return {"is_favorite": favorite is not None}


@router.get("/stats", response_model=FavoritesStatsRead)
async def get_favorites_stats(
    user_id: str = Query(..., description="User ID or session ID"),
    db: AsyncSession = Depends(get_db)
):
    """Obține statistici despre favorite și notificări"""
    
    # Count favorites
    favorites_count_query = select(func.count(UserFavoriteLaw.id)).where(
        UserFavoriteLaw.user_id == user_id
    )
    favorites_count_result = await db.execute(favorites_count_query)
    total_favorites = favorites_count_result.scalar() or 0
    
    # Count unread notifications
    notifications_count_query = select(func.count(LawNotification.id)).where(
        LawNotification.user_id == user_id,
        LawNotification.is_read == False
    )
    notifications_count_result = await db.execute(notifications_count_query)
    unread_notifications = notifications_count_result.scalar() or 0
    
    # Get last update time
    last_updated_query = select(func.max(UserFavoriteLaw.created_at)).where(
        UserFavoriteLaw.user_id == user_id
    )
    last_updated_result = await db.execute(last_updated_query)
    last_updated = last_updated_result.scalar()
    
    return FavoritesStatsRead(
        total_favorites=total_favorites,
        unread_notifications=unread_notifications,
        last_updated=last_updated
    )