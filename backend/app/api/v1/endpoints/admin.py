# app/api/v1/endpoints/admin.py
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

import logging
import jwt  # PyJWT
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from app.core.config import settings
from app.core.database import get_db
from app.models.admin_user import AdminUser
from app.models.municipality import Municipality
from app.models.document import Document
from app.models.conversation import Conversation

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

# ===============================
# Pydantic Schemas
# ===============================

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Admin email")
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
    email: EmailStr
    full_name: Optional[str]
    role: str
    is_active: bool
    last_login: Optional[str]
    created_at: str

# ===============================
# Security helpers (bcrypt + JWT)
# ===============================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creează un JWT cu sub = id-ul userului.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

# ===============================
# Current user dependency (Bearer)
# ===============================

async def get_current_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    """
    Extrage și validează userul curent din Bearer JWT.
    Așteaptă 'sub' = user.id (UUID) în token.
    """
    token = credentials.credentials
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise cred_exc
    except jwt.PyJWTError:
        # (în versiunile noi baza e InvalidTokenError, PyJWTError e ok generic)
        raise cred_exc

    result = await db.execute(select(AdminUser).where(AdminUser.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise cred_exc

    return user

# ===============================
# Endpoints
# ===============================

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Admin login. Verifică email/parolă din tabela admin_users.
    Returnează JWT + info user minimă pentru UI.
    """
    try:
        result = await db.execute(select(AdminUser).where(AdminUser.email == login_data.email))
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Token cu sub = user.id (UUID string)
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
        )

        # Update last_login
        user.last_login = datetime.utcnow()
        await db.commit()

        return LoginResponse(
            access_token=access_token,
            expires_in=settings.JWT_EXPIRE_MINUTES * 60,
            user={
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Login error")
        raise HTTPException(status_code=500, detail="Login failed")

@router.get("/me", response_model=AdminUserResponse)
async def get_current_user(current_user: AdminUser = Depends(get_current_admin_user)):
    """
    Returnează userul curent pentru checkAuthStatus() din frontend.
    """
    return AdminUserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        last_login=current_user.last_login.isoformat() if current_user.last_login else None,
        created_at=current_user.created_at.isoformat(),
    )

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user),
):
    """
    Statistici pentru dashboard-ul de admin.
    """
    try:
        # Municipalități
        total_municipalities = (await db.execute(select(func.count(Municipality.id)))).scalar() or 0
        active_municipalities = (
            await db.execute(select(func.count(Municipality.id)).where(Municipality.is_active == True))
        ).scalar() or 0

        # Documente
        total_documents = (await db.execute(select(func.count(Document.id)))).scalar() or 0
        processed_documents = (
            await db.execute(select(func.count(Document.id)).where(Document.is_processed == True))
        ).scalar() or 0

        # Conversații
        total_conversations = (await db.execute(select(func.count(Conversation.id)))).scalar() or 0
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        conversations_today = (
            await db.execute(select(func.count(Conversation.id)).where(Conversation.created_at >= today))
        ).scalar() or 0

        return AdminDashboardStats(
            total_municipalities=total_municipalities,
            active_municipalities=active_municipalities,
            total_documents=total_documents,
            processed_documents=processed_documents,
            total_conversations=total_conversations,
            conversations_today=conversations_today,
        )
    except Exception:
        logger.exception("Dashboard stats error")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard statistics")

@router.get("/users", response_model=List[AdminUserResponse])
async def list_admin_users(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_admin_user),
):
    """
    Listă administratori (doar super_admin).
    """
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    try:
        users = (await db.execute(select(AdminUser).order_by(AdminUser.created_at.desc()))).scalars().all()
        return [
            AdminUserResponse(
                id=str(u.id),
                email=u.email,
                full_name=u.full_name,
                role=u.role,
                is_active=u.is_active,
                last_login=u.last_login.isoformat() if u.last_login else None,
                created_at=u.created_at.isoformat(),
            )
            for u in users
        ]
    except Exception:
        logger.exception("List admin users error")
        raise HTTPException(status_code=500, detail="Failed to retrieve admin users")
