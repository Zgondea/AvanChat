from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import logging

from app.core.database import get_db
from app.core.config import settings
from app.models.admin_user import AdminUser
from app.models.municipality import Municipality
from app.models.document import Document
from app.models.conversation import Conversation

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

# Pydantic models
class LoginRequest(BaseModel):
    email: str = Field(..., description="Admin email")
    password: str = Field(..., description="Admin password")

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class AdminDashboardStats(BaseModel):
    total_municipalities: int
    active_municipalities: int
    total_documents: int
    processed_documents: int
    total_conversations: int
    conversations_today: int

class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    last_login: Optional[str]
    created_at: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)

async def get_current_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> AdminUser:
    """Get current authenticated admin user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            credentials.credentials, 
            settings.JWT_SECRET_KEY, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    query = select(AdminUser).where(AdminUser.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if user is None or not user.is_active:
        raise credentials_exception
    
    return user

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Admin login endpoint"""
    try:
        # Find user by email
        query = select(AdminUser).where(AdminUser.email == login_data.email)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, 
            expires_delta=access_token_expires
        )
        
        # Update last login
        user.last_login = datetime.utcnow()
        await db.commit()
        
        return LoginResponse(
            access_token=access_token,
            expires_in=settings.JWT_EXPIRE_MINUTES * 60,
            user={
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.get("/me", response_model=AdminUserResponse)
async def get_current_user(
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """Get current user info"""
    return AdminUserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        last_login=current_user.last_login.isoformat() if current_user.last_login else None,
        created_at=current_user.created_at.isoformat()
    )

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """Get dashboard statistics"""
    try:
        # Count municipalities
        total_municipalities_query = select(func.count(Municipality.id))
        total_municipalities_result = await db.execute(total_municipalities_query)
        total_municipalities = total_municipalities_result.scalar() or 0
        
        active_municipalities_query = select(func.count(Municipality.id)).where(
            Municipality.is_active == True
        )
        active_municipalities_result = await db.execute(active_municipalities_query)
        active_municipalities = active_municipalities_result.scalar() or 0
        
        # Count documents
        total_documents_query = select(func.count(Document.id))
        total_documents_result = await db.execute(total_documents_query)
        total_documents = total_documents_result.scalar() or 0
        
        processed_documents_query = select(func.count(Document.id)).where(
            Document.is_processed == True
        )
        processed_documents_result = await db.execute(processed_documents_query)
        processed_documents = processed_documents_result.scalar() or 0
        
        # Count conversations
        total_conversations_query = select(func.count(Conversation.id))
        total_conversations_result = await db.execute(total_conversations_query)
        total_conversations = total_conversations_result.scalar() or 0
        
        # Count conversations today
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        conversations_today_query = select(func.count(Conversation.id)).where(
            Conversation.created_at >= today
        )
        conversations_today_result = await db.execute(conversations_today_query)
        conversations_today = conversations_today_result.scalar() or 0
        
        return AdminDashboardStats(
            total_municipalities=total_municipalities,
            active_municipalities=active_municipalities,
            total_documents=total_documents,
            processed_documents=processed_documents,
            total_conversations=total_conversations,
            conversations_today=conversations_today
        )
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics"
        )

@router.get("/users", response_model=List[AdminUserResponse])
async def list_admin_users(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user)
):
    """List all admin users (super admin only)"""
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    try:
        query = select(AdminUser).order_by(AdminUser.created_at.desc())
        result = await db.execute(query)
        users = result.scalars().all()
        
        return [
            AdminUserResponse(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                is_active=user.is_active,
                last_login=user.last_login.isoformat() if user.last_login else None,
                created_at=user.created_at.isoformat()
            )
            for user in users
        ]
        
    except Exception as e:
        logger.error(f"List admin users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve admin users"
        )