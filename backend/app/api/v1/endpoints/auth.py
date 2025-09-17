from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.admin_user import AdminUser  # modelul tău
from app.schemas.admin_user import AdminUserOut
from app.core.security import verify_password, create_access_token, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/dashboard", tags=["auth"])

# Doar pentru a extrage tokenul din header (și pentru /docs)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/dashboard/login")

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AdminUserOut

@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # update last_login
    user.last_login = datetime.utcnow()
    await db.commit()

    token = create_access_token(subject=user.email)
    return {"access_token": token, "token_type": "bearer", "user": user}

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(AdminUser).where(AdminUser.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/me", response_model=AdminUserOut)
async def read_current_user(current_user: AdminUser = Depends(get_current_user)):
    return current_user
