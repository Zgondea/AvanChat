import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload

from app.core.database import get_async_session
from app.models.laws import Law, LawVersion, LawSection
from app.models.favorites import UserFavoriteLaw, LawNotification, LawVersionTracking
from app.services.laws_diff import compare_law_versions

logger = logging.getLogger(__name__)


class LawMonitoringService:
    """
    Service pentru monitorizarea schimbărilor în legi și trimiterea de notificări
    """
    
    def __init__(self):
        self.check_interval = 3600  # Check every hour (3600 seconds)
        self.running = False
    
    async def start_monitoring(self):
        """Pornește serviciul de monitoring în background"""
        if self.running:
            logger.warning("Law monitoring service is already running")
            return
        
        self.running = True
        logger.info("Starting law monitoring service...")
        
        try:
            while self.running:
                await self.check_for_law_changes()
                await asyncio.sleep(self.check_interval)
        except Exception as e:
            logger.error(f"Error in law monitoring service: {e}")
        finally:
            self.running = False
            logger.info("Law monitoring service stopped")
    
    async def stop_monitoring(self):
        """Oprește serviciul de monitoring"""
        self.running = False
        logger.info("Stopping law monitoring service...")
    
    async def check_for_law_changes(self):
        """Verifică dacă s-au făcut modificări la legi și trimite notificări"""
        async for session in get_async_session():
            try:
                logger.info("Checking for law changes...")
                
                # Obține toate legile care au versiuni noi
                changes = await self._detect_law_changes(session)
                
                if not changes:
                    logger.info("No law changes detected")
                    return
                
                logger.info(f"Detected {len(changes)} law changes")
                
                # Generează notificări pentru utilizatori
                for law_id, change_info in changes.items():
                    await self._create_notifications_for_law(session, law_id, change_info)
                
                await session.commit()
                logger.info("Law monitoring check completed successfully")
                
            except Exception as e:
                logger.error(f"Error checking for law changes: {e}")
                await session.rollback()
    
    async def _detect_law_changes(self, session: AsyncSession) -> Dict[str, Dict[str, Any]]:
        """Detectează schimbări în legi comparând cu ultima verificare"""
        changes = {}
        
        # Obține toate legile care au favorite
        laws_with_favorites_query = select(Law.id).join(UserFavoriteLaw).distinct()
        laws_with_favorites_result = await session.execute(laws_with_favorites_query)
        law_ids = [row[0] for row in laws_with_favorites_result.all()]
        
        if not law_ids:
            return changes
        
        for law_id in law_ids:
            # Obține sau creează tracking record
            tracking = await self._get_or_create_tracking(session, law_id)
            
            # Obține ultima versiune disponibilă
            latest_version_query = select(func.max(LawVersion.version_no)).where(
                LawVersion.law_id == law_id
            )
            latest_version_result = await session.execute(latest_version_query)
            latest_version = latest_version_result.scalar()
            
            if not latest_version:
                continue
            
            # Verifică dacă există versiuni noi
            if latest_version > tracking.last_checked_version:
                logger.info(f"New version detected for law {law_id}: v{tracking.last_checked_version} -> v{latest_version}")
                
                # Calculează diferențele
                change_info = await self._analyze_changes(
                    session, law_id, tracking.last_checked_version, latest_version
                )
                
                if change_info:
                    changes[law_id] = change_info
                
                # Actualizează tracking
                await session.execute(
                    update(LawVersionTracking)
                    .where(LawVersionTracking.law_id == law_id)
                    .values(
                        last_checked_version=latest_version,
                        updated_at=datetime.utcnow()
                    )
                )
        
        return changes
    
    async def _get_or_create_tracking(self, session: AsyncSession, law_id: str) -> LawVersionTracking:
        """Obține sau creează un record de tracking pentru o lege"""
        tracking_query = select(LawVersionTracking).where(
            LawVersionTracking.law_id == law_id
        )
        tracking_result = await session.execute(tracking_query)
        tracking = tracking_result.scalar_one_or_none()
        
        if not tracking:
            # Creează tracking nou cu versiunea curentă
            current_version_query = select(func.max(LawVersion.version_no)).where(
                LawVersion.law_id == law_id
            )
            current_version_result = await session.execute(current_version_query)
            current_version = current_version_result.scalar() or 0
            
            tracking = LawVersionTracking(
                law_id=law_id,
                last_checked_version=current_version
            )
            session.add(tracking)
            await session.flush()
        
        return tracking
    
    async def _analyze_changes(
        self, 
        session: AsyncSession, 
        law_id: str, 
        from_version: int, 
        to_version: int
    ) -> Optional[Dict[str, Any]]:
        """Analizează schimbările între două versiuni ale unei legi"""
        try:
            # Obține detaliile legii
            law_query = select(Law).where(Law.id == law_id)
            law_result = await session.execute(law_query)
            law = law_result.scalar_one_or_none()
            
            if not law:
                return None
            
            # Folosește serviciul de comparare existent
            comparison = await compare_law_versions(session, law_id, from_version, to_version)
            
            if not comparison:
                return None
            
            # Creează sumar al schimbărilor
            change_summary = []
            if comparison['summary']['added_count'] > 0:
                change_summary.append(f"{comparison['summary']['added_count']} secțiuni adăugate")
            if comparison['summary']['removed_count'] > 0:
                change_summary.append(f"{comparison['summary']['removed_count']} secțiuni eliminate")
            if comparison['summary']['modified_count'] > 0:
                change_summary.append(f"{comparison['summary']['modified_count']} secțiuni modificate")
            
            return {
                'law': law,
                'from_version': from_version,
                'to_version': to_version,
                'summary': comparison['summary'],
                'change_summary': ', '.join(change_summary),
                'total_change_pct': comparison['summary']['changed_pct']
            }
            
        except Exception as e:
            logger.error(f"Error analyzing changes for law {law_id}: {e}")
            return None
    
    async def _create_notifications_for_law(
        self, 
        session: AsyncSession, 
        law_id: str, 
        change_info: Dict[str, Any]
    ):
        """Creează notificări pentru toți utilizatorii care au legea la favorite"""
        # Obține toți utilizatorii care au legea la favorite
        favorites_query = select(UserFavoriteLaw).where(
            UserFavoriteLaw.law_id == law_id
        )
        favorites_result = await session.execute(favorites_query)
        favorites = favorites_result.scalars().all()
        
        if not favorites:
            return
        
        law = change_info['law']
        from_version = change_info['from_version']
        to_version = change_info['to_version']
        change_summary = change_info['change_summary']
        total_change_pct = change_info['total_change_pct']
        
        # Generează mesaj de notificare
        if total_change_pct > 50:
            notification_type = "content_change"
            message = f"Lege modificată major: {law.title} (v{from_version} → v{to_version}). {change_summary}."
        else:
            notification_type = "new_version"
            message = f"Versiune nouă disponibilă: {law.title} (v{from_version} → v{to_version}). {change_summary}."
        
        # Creează notificări pentru fiecare utilizator
        for favorite in favorites:
            # Verifică dacă nu există deja o notificare similară
            existing_notification_query = select(LawNotification).where(
                LawNotification.user_id == favorite.user_id,
                LawNotification.law_id == law_id,
                LawNotification.version_from == from_version,
                LawNotification.version_to == to_version
            )
            existing_result = await session.execute(existing_notification_query)
            existing_notification = existing_result.scalar_one_or_none()
            
            if existing_notification:
                continue  # Skip if notification already exists
            
            notification = LawNotification(
                user_id=favorite.user_id,
                law_id=law_id,
                notification_type=notification_type,
                message=message,
                version_from=from_version,
                version_to=to_version,
                change_summary=change_summary
            )
            
            session.add(notification)
            logger.info(f"Created notification for user {favorite.user_id} about law {law.title}")
    
    async def force_check_law(self, law_id: str) -> bool:
        """Forțează verificarea unei legi specifice (pentru testing)"""
        async for session in get_async_session():
            try:
                tracking = await self._get_or_create_tracking(session, law_id)
                
                # Reset tracking to force detection
                await session.execute(
                    update(LawVersionTracking)
                    .where(LawVersionTracking.law_id == law_id)
                    .values(last_checked_version=0)
                )
                
                # Check for changes
                changes = await self._detect_law_changes(session)
                
                if law_id in changes:
                    await self._create_notifications_for_law(session, law_id, changes[law_id])
                    await session.commit()
                    return True
                
                return False
                
            except Exception as e:
                logger.error(f"Error force checking law {law_id}: {e}")
                await session.rollback()
                return False


# Global service instance
law_monitoring_service = LawMonitoringService()


async def start_law_monitoring():
    """Start the law monitoring service"""
    await law_monitoring_service.start_monitoring()


async def stop_law_monitoring():
    """Stop the law monitoring service"""
    await law_monitoring_service.stop_monitoring()


async def force_check_law(law_id: str) -> bool:
    """Force check a specific law for testing"""
    return await law_monitoring_service.force_check_law(law_id)