from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
import logging

from app.core.database import get_db
from app.models.municipality import Municipality
from app.models.document import Document
from app.models.conversation import Conversation

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class MunicipalityBase(BaseModel):
    name: str = Field(..., description="Municipality name")
    domain: Optional[str] = Field(None, description="Municipality domain")
    description: Optional[str] = Field(None, description="Municipality description")
    contact_email: Optional[str] = Field(None, description="Contact email")
    contact_phone: Optional[str] = Field(None, description="Contact phone")
    address: Optional[str] = Field(None, description="Municipality address")

class MunicipalityCreate(MunicipalityBase):
    pass

class MunicipalityUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class MunicipalityResponse(MunicipalityBase):
    id: str
    is_active: bool
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True

class MunicipalityStatsResponse(BaseModel):
    id: str
    name: str
    total_documents: int
    processed_documents: int
    total_conversations: int
    active_conversations: int

@router.get("/", response_model=List[MunicipalityResponse])
async def list_municipalities(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    active_only: bool = Query(True, description="Return only active municipalities"),
    search: Optional[str] = Query(None, description="Search by name or domain"),
    db: AsyncSession = Depends(get_db)
):
    """Get list of municipalities with optional filtering"""
    try:
        query = select(Municipality)
        
        # Filter by active status
        if active_only:
            query = query.where(Municipality.is_active == True)
        
        # Search filter
        if search:
            search_term = f"%{search}%"
            query = query.where(
                Municipality.name.ilike(search_term) |
                Municipality.domain.ilike(search_term)
            )
        
        # Add pagination
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        municipalities = result.scalars().all()
        
        return [
            MunicipalityResponse(
                id=str(municipality.id),
                name=municipality.name,
                domain=municipality.domain,
                description=municipality.description,
                contact_email=municipality.contact_email,
                contact_phone=municipality.contact_phone,
                address=municipality.address,
                is_active=municipality.is_active,
                created_at=municipality.created_at.isoformat(),
                updated_at=municipality.updated_at.isoformat()
            )
            for municipality in municipalities
        ]
        
    except Exception as e:
        logger.error(f"Error listing municipalities: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve municipalities")

@router.get("/{municipality_id}", response_model=MunicipalityResponse)
async def get_municipality(
    municipality_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific municipality by ID"""
    try:
        query = select(Municipality).where(Municipality.id == municipality_id)
        result = await db.execute(query)
        municipality = result.scalar_one_or_none()
        
        if not municipality:
            raise HTTPException(status_code=404, detail="Municipality not found")
        
        return MunicipalityResponse(
            id=str(municipality.id),
            name=municipality.name,
            domain=municipality.domain,
            description=municipality.description,
            contact_email=municipality.contact_email,
            contact_phone=municipality.contact_phone,
            address=municipality.address,
            is_active=municipality.is_active,
            created_at=municipality.created_at.isoformat(),
            updated_at=municipality.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving municipality {municipality_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve municipality")

@router.post("/", response_model=MunicipalityResponse)
async def create_municipality(
    municipality_data: MunicipalityCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new municipality"""
    try:
        # Check if domain already exists
        if municipality_data.domain:
            existing_query = select(Municipality).where(Municipality.domain == municipality_data.domain)
            existing_result = await db.execute(existing_query)
            if existing_result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Domain already exists")
        
        # Create new municipality
        municipality = Municipality(
            name=municipality_data.name,
            domain=municipality_data.domain,
            description=municipality_data.description,
            contact_email=municipality_data.contact_email,
            contact_phone=municipality_data.contact_phone,
            address=municipality_data.address
        )
        
        db.add(municipality)
        await db.commit()
        await db.refresh(municipality)
        
        return MunicipalityResponse(
            id=str(municipality.id),
            name=municipality.name,
            domain=municipality.domain,
            description=municipality.description,
            contact_email=municipality.contact_email,
            contact_phone=municipality.contact_phone,
            address=municipality.address,
            is_active=municipality.is_active,
            created_at=municipality.created_at.isoformat(),
            updated_at=municipality.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating municipality: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create municipality")

@router.put("/{municipality_id}", response_model=MunicipalityResponse)
async def update_municipality(
    municipality_id: str,
    municipality_data: MunicipalityUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing municipality"""
    try:
        query = select(Municipality).where(Municipality.id == municipality_id)
        result = await db.execute(query)
        municipality = result.scalar_one_or_none()
        
        if not municipality:
            raise HTTPException(status_code=404, detail="Municipality not found")
        
        # Check domain uniqueness if being updated
        if municipality_data.domain and municipality_data.domain != municipality.domain:
            existing_query = select(Municipality).where(
                and_(
                    Municipality.domain == municipality_data.domain,
                    Municipality.id != municipality_id
                )
            )
            existing_result = await db.execute(existing_query)
            if existing_result.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Domain already exists")
        
        # Update fields
        update_data = municipality_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(municipality, field, value)
        
        await db.commit()
        await db.refresh(municipality)
        
        return MunicipalityResponse(
            id=str(municipality.id),
            name=municipality.name,
            domain=municipality.domain,
            description=municipality.description,
            contact_email=municipality.contact_email,
            contact_phone=municipality.contact_phone,
            address=municipality.address,
            is_active=municipality.is_active,
            created_at=municipality.created_at.isoformat(),
            updated_at=municipality.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating municipality {municipality_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update municipality")

@router.delete("/{municipality_id}")
async def delete_municipality(
    municipality_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a municipality (soft delete by deactivating)"""
    try:
        query = select(Municipality).where(Municipality.id == municipality_id)
        result = await db.execute(query)
        municipality = result.scalar_one_or_none()
        
        if not municipality:
            raise HTTPException(status_code=404, detail="Municipality not found")
        
        # Soft delete by deactivating
        municipality.is_active = False
        await db.commit()
        
        return {"message": "Municipality deactivated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting municipality {municipality_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete municipality")

@router.get("/{municipality_id}/stats", response_model=MunicipalityStatsResponse)
async def get_municipality_stats(
    municipality_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a municipality"""
    try:
        # Check if municipality exists
        municipality_query = select(Municipality).where(Municipality.id == municipality_id)
        municipality_result = await db.execute(municipality_query)
        municipality = municipality_result.scalar_one_or_none()
        
        if not municipality:
            raise HTTPException(status_code=404, detail="Municipality not found")
        
        # Count total documents
        total_docs_query = select(func.count(Document.id)).where(
            Document.municipality_id == municipality_id
        )
        total_docs_result = await db.execute(total_docs_query)
        total_documents = total_docs_result.scalar() or 0
        
        # Count processed documents
        processed_docs_query = select(func.count(Document.id)).where(
            and_(
                Document.municipality_id == municipality_id,
                Document.is_processed == True
            )
        )
        processed_docs_result = await db.execute(processed_docs_query)
        processed_documents = processed_docs_result.scalar() or 0
        
        # Count total conversations
        total_convs_query = select(func.count(Conversation.id)).where(
            Conversation.municipality_id == municipality_id
        )
        total_convs_result = await db.execute(total_convs_query)
        total_conversations = total_convs_result.scalar() or 0
        
        # Count active conversations (last 24 hours)
        from datetime import datetime, timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        active_convs_query = select(func.count(Conversation.id)).where(
            and_(
                Conversation.municipality_id == municipality_id,
                Conversation.is_active == True,
                Conversation.updated_at >= yesterday
            )
        )
        active_convs_result = await db.execute(active_convs_query)
        active_conversations = active_convs_result.scalar() or 0
        
        return MunicipalityStatsResponse(
            id=str(municipality.id),
            name=municipality.name,
            total_documents=total_documents,
            processed_documents=processed_documents,
            total_conversations=total_conversations,
            active_conversations=active_conversations
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting municipality stats {municipality_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve municipality statistics")