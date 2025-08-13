#!/usr/bin/env python3
"""
Script pentru crearea unui user admin implicit
"""
import asyncio
import sys
sys.path.append('/Users/zgondea/Desktop/avanchat/backend')

from sqlalchemy import select
from passlib.context import CryptContext
import uuid
from datetime import datetime

from app.core.database import AsyncSessionLocal, engine
from app.models.admin_user import AdminUser

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_user():
    """Creează un user admin implicit"""
    
    # Date pentru admin
    email = "admin@chatlegislativ.ro"
    password = "admin123"
    full_name = "Administrator"
    
    async with AsyncSessionLocal() as db:
        try:
            # Verifică dacă există deja
            query = select(AdminUser).where(AdminUser.email == email)
            result = await db.execute(query)
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"❌ User admin {email} există deja!")
                return
            
            # Hash password
            password_hash = pwd_context.hash(password)
            
            # Creează user admin
            admin_user = AdminUser(
                id=uuid.uuid4(),
                email=email,
                password_hash=password_hash,
                full_name=full_name,
                role="super_admin",
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            db.add(admin_user)
            await db.commit()
            
            print(f"✅ User admin creat cu succes!")
            print(f"📧 Email: {email}")
            print(f"🔐 Parola: {password}")
            print(f"👤 Nume: {full_name}")
            print(f"🎯 Rol: super_admin")
            
        except Exception as e:
            print(f"❌ Eroare la crearea user-ului admin: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(create_admin_user())