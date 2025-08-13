from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import logging

from app.core.database import get_db
from app.models.municipality import Municipality
from app.models.conversation import Conversation, Message
from app.services.advanced_rag_service import AdvancedRAGService
from app.services.embedding_service import EmbeddingService
from app.services.ollama_service import OllamaService
from sqlalchemy import select

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models for requests/responses
class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender (user/assistant)")
    content: str = Field(..., description="Message content")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    municipality_domain: Optional[str] = Field(None, description="Municipality domain")
    municipality_id: Optional[str] = Field(None, description="Municipality ID")
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")
    conversation_history: Optional[List[ChatMessage]] = Field([], description="Previous messages in conversation")

class ChatResponse(BaseModel):
    response: str = Field(..., description="AI generated response")
    sources: List[Dict[str, Any]] = Field([], description="Source documents used")
    confidence: float = Field(..., description="Confidence score of the response")
    session_id: str = Field(..., description="Session ID for conversation tracking")
    municipality: Dict[str, Any] = Field(..., description="Municipality information")

class HealthCheckResponse(BaseModel):
    status: str
    ollama_ready: bool
    embedding_ready: bool

# Dependencies for services
async def get_rag_service() -> AdvancedRAGService:
    embedding_service = EmbeddingService()
    ollama_service = OllamaService()
    
    # Ensure services are initialized
    if not embedding_service.model:
        await embedding_service.initialize()
    
    return AdvancedRAGService(embedding_service, ollama_service)

@router.post("/", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    http_request: Request,
    db: AsyncSession = Depends(get_db),
    rag_service: AdvancedRAGService = Depends(get_rag_service)
):
    """Main chat endpoint for processing user messages"""
    try:
        # Determine municipality
        municipality = None
        
        if request.municipality_id:
            municipality_query = select(Municipality).where(Municipality.id == request.municipality_id)
            result = await db.execute(municipality_query)
            municipality = result.scalar_one_or_none()
        elif request.municipality_domain:
            municipality_query = select(Municipality).where(Municipality.domain == request.municipality_domain)
            result = await db.execute(municipality_query)
            municipality = result.scalar_one_or_none()
        
        if not municipality:
            raise HTTPException(
                status_code=400,
                detail="Municipality not found. Please provide valid municipality_id or municipality_domain."
            )
        
        if not municipality.is_active:
            raise HTTPException(
                status_code=403,
                detail="Municipality is not active."
            )
        
        # Generate or use existing session ID
        session_id = request.session_id or str(uuid.uuid4())
        
        # Get or create conversation
        conversation = await get_or_create_conversation(
            db, municipality.id, session_id, http_request
        )
        
        # Save user message
        user_message = Message(
            conversation_id=conversation.id,
            role="user",
            content=request.message,
            message_metadata={
                "ip_address": http_request.client.host if http_request.client else None,
                "user_agent": http_request.headers.get("user-agent")
            }
        )
        db.add(user_message)
        await db.commit()
        
        # Generate response using RAG
        rag_response = await rag_service.generate_response(
            db=db,
            question=request.message,
            municipality_id=str(municipality.id),
            conversation_history=[
                {"role": msg.role, "content": msg.content}
                for msg in request.conversation_history or []
            ]
        )
        
        # Save assistant response
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=rag_response["response"],
            sources=rag_response["sources"],
            message_metadata={
                "confidence": rag_response["confidence"],
                "model_used": "llama3.2:3b"
            }
        )
        db.add(assistant_message)
        await db.commit()
        
        return ChatResponse(
            response=rag_response["response"],
            sources=rag_response["sources"],
            confidence=rag_response["confidence"],
            session_id=session_id,
            municipality={
                "id": str(municipality.id),
                "name": municipality.name,
                "domain": municipality.domain
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error occurred")

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check for chat services"""
    try:
        # Check Ollama service
        ollama_service = OllamaService()
        ollama_ready = await ollama_service.is_ready()
        await ollama_service.close()
        
        # Check embedding service
        embedding_service = EmbeddingService()
        embedding_ready = embedding_service.model is not None
        if not embedding_ready:
            try:
                await embedding_service.initialize()
                embedding_ready = True
            except:
                embedding_ready = False
        await embedding_service.close()
        
        return HealthCheckResponse(
            status="healthy" if (ollama_ready and embedding_ready) else "degraded",
            ollama_ready=ollama_ready,
            embedding_ready=embedding_ready
        )
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return HealthCheckResponse(
            status="unhealthy",
            ollama_ready=False,
            embedding_ready=False
        )

@router.get("/municipalities")
async def list_active_municipalities(db: AsyncSession = Depends(get_db)):
    """Get list of active municipalities"""
    try:
        query = select(Municipality).where(Municipality.is_active == True)
        result = await db.execute(query)
        municipalities = result.scalars().all()
        
        return [
            {
                "id": str(municipality.id),
                "name": municipality.name,
                "domain": municipality.domain,
                "description": municipality.description
            }
            for municipality in municipalities
        ]
        
    except Exception as e:
        logger.error(f"Error listing municipalities: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve municipalities")

@router.get("/cache/stats")
async def get_cache_stats(
    municipality_id: str = None,
    rag_service: AdvancedRAGService = Depends(get_rag_service)
):
    """Get cache statistics"""
    try:
        if not rag_service.cache_service.redis_client:
            await rag_service.cache_service.initialize()
            
        if municipality_id:
            stats = await rag_service.cache_service.get_cache_stats(municipality_id)
        else:
            # Get general cache info
            health = await rag_service.cache_service.healthcheck()
            stats = {
                "cache_health": health,
                "note": "Provide municipality_id parameter for detailed stats"
            }
            
        return stats
        
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get cache statistics")

@router.post("/cache/clear")
async def clear_cache(
    municipality_id: str = None,
    rag_service: AdvancedRAGService = Depends(get_rag_service)
):
    """Clear cache for municipality or all cache"""
    try:
        if not rag_service.cache_service.redis_client:
            await rag_service.cache_service.initialize()
            
        success = await rag_service.cache_service.clear_cache(municipality_id)
        
        if success:
            message = f"Cache cleared for municipality {municipality_id}" if municipality_id else "All cache cleared"
            return {"success": True, "message": message}
        else:
            return {"success": False, "message": "Failed to clear cache"}
            
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")

async def get_or_create_conversation(
    db: AsyncSession,
    municipality_id: uuid.UUID,
    session_id: str,
    request: Request
) -> Conversation:
    """Get existing conversation or create new one"""
    try:
        # Try to find existing conversation
        query = select(Conversation).where(
            Conversation.municipality_id == municipality_id,
            Conversation.session_id == session_id,
            Conversation.is_active == True
        )
        result = await db.execute(query)
        conversation = result.scalar_one_or_none()
        
        if conversation:
            return conversation
        
        # Create new conversation
        conversation = Conversation(
            municipality_id=municipality_id,
            session_id=session_id,
            user_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        
        return conversation
        
    except Exception as e:
        logger.error(f"Error managing conversation: {e}")
        raise