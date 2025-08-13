from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.models.conversation import Conversation, Message
from app.models.municipality import Municipality

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: str

class ConversationResponse(BaseModel):
    id: str
    municipality: Dict[str, str]
    session_id: str
    is_active: bool
    created_at: str
    updated_at: str
    message_count: int
    last_message: Optional[str] = None

class ConversationDetailResponse(BaseModel):
    id: str
    municipality: Dict[str, str]
    session_id: str
    user_ip: Optional[str]
    user_agent: Optional[str]
    is_active: bool
    created_at: str
    updated_at: str
    messages: List[MessageResponse]

@router.get("/", response_model=List[ConversationResponse])
async def list_conversations(
    municipality_id: Optional[str] = Query(None, description="Filter by municipality"),
    active_only: bool = Query(True, description="Show only active conversations"),
    days: int = Query(7, description="Show conversations from last N days"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """List conversations with optional filtering"""
    try:
        query = select(Conversation).options(
            selectinload(Conversation.municipality),
            selectinload(Conversation.messages)
        )
        
        # Filter by municipality
        if municipality_id:
            query = query.where(Conversation.municipality_id == municipality_id)
        
        # Filter by active status
        if active_only:
            query = query.where(Conversation.is_active == True)
        
        # Filter by date range
        if days > 0:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            query = query.where(Conversation.created_at >= cutoff_date)
        
        # Add pagination and ordering
        query = query.order_by(Conversation.updated_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        conversations = result.scalars().all()
        
        response = []
        for conv in conversations:
            # Get last message content
            last_message = None
            if conv.messages:
                sorted_messages = sorted(conv.messages, key=lambda m: m.created_at, reverse=True)
                if sorted_messages:
                    last_message = sorted_messages[0].content[:100] + "..." if len(sorted_messages[0].content) > 100 else sorted_messages[0].content
            
            response.append(ConversationResponse(
                id=str(conv.id),
                municipality={
                    "id": str(conv.municipality.id),
                    "name": conv.municipality.name
                },
                session_id=conv.session_id,
                is_active=conv.is_active,
                created_at=conv.created_at.isoformat(),
                updated_at=conv.updated_at.isoformat(),
                message_count=len(conv.messages),
                last_message=last_message
            ))
        
        return response
        
    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve conversations")

@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed conversation with all messages"""
    try:
        query = select(Conversation).options(
            selectinload(Conversation.municipality),
            selectinload(Conversation.messages)
        ).where(Conversation.id == conversation_id)
        
        result = await db.execute(query)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Sort messages by creation time
        sorted_messages = sorted(conversation.messages, key=lambda m: m.created_at)
        
        messages = [
            MessageResponse(
                id=str(msg.id),
                role=msg.role,
                content=msg.content,
                sources=msg.sources,
                created_at=msg.created_at.isoformat()
            )
            for msg in sorted_messages
        ]
        
        return ConversationDetailResponse(
            id=str(conversation.id),
            municipality={
                "id": str(conversation.municipality.id),
                "name": conversation.municipality.name
            },
            session_id=conversation.session_id,
            user_ip=conversation.user_ip,
            user_agent=conversation.user_agent,
            is_active=conversation.is_active,
            created_at=conversation.created_at.isoformat(),
            updated_at=conversation.updated_at.isoformat(),
            messages=messages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve conversation")

@router.put("/{conversation_id}/deactivate")
async def deactivate_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Deactivate a conversation"""
    try:
        query = select(Conversation).where(Conversation.id == conversation_id)
        result = await db.execute(query)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        conversation.is_active = False
        await db.commit()
        
        return {"message": "Conversation deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating conversation {conversation_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to deactivate conversation")

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a conversation and all its messages"""
    try:
        query = select(Conversation).where(Conversation.id == conversation_id)
        result = await db.execute(query)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        await db.delete(conversation)
        await db.commit()
        
        return {"message": "Conversation deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation {conversation_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete conversation")

@router.get("/analytics/summary")
async def get_conversation_analytics(
    municipality_id: Optional[str] = Query(None),
    days: int = Query(30, description="Analytics period in days"),
    db: AsyncSession = Depends(get_db)
):
    """Get conversation analytics summary"""
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Base query
        base_query = select(Conversation).where(Conversation.created_at >= cutoff_date)
        
        if municipality_id:
            base_query = base_query.where(Conversation.municipality_id == municipality_id)
        
        # Total conversations
        total_conversations_result = await db.execute(
            select(func.count(Conversation.id)).where(
                Conversation.created_at >= cutoff_date
            ).where(
                Conversation.municipality_id == municipality_id if municipality_id else True
            )
        )
        total_conversations = total_conversations_result.scalar() or 0
        
        # Active conversations
        active_conversations_result = await db.execute(
            select(func.count(Conversation.id)).where(
                and_(
                    Conversation.created_at >= cutoff_date,
                    Conversation.is_active == True
                )
            ).where(
                Conversation.municipality_id == municipality_id if municipality_id else True
            )
        )
        active_conversations = active_conversations_result.scalar() or 0
        
        # Total messages
        total_messages_result = await db.execute(
            select(func.count(Message.id)).join(Conversation).where(
                Conversation.created_at >= cutoff_date
            ).where(
                Conversation.municipality_id == municipality_id if municipality_id else True
            )
        )
        total_messages = total_messages_result.scalar() or 0
        
        # Average messages per conversation
        avg_messages = total_messages / total_conversations if total_conversations > 0 else 0
        
        return {
            "period_days": days,
            "total_conversations": total_conversations,
            "active_conversations": active_conversations,
            "total_messages": total_messages,
            "average_messages_per_conversation": round(avg_messages, 2),
            "municipality_id": municipality_id
        }
        
    except Exception as e:
        logger.error(f"Error getting conversation analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")