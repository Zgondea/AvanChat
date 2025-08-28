#!/usr/bin/env python3
"""
Script pentru inițializarea utilizatorului admin
Rulează acest script după primul deploy pentru a crea admin-ul
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.append('/app')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import bcrypt

from app.models.admin_user import AdminUser
from app.core.config import settings

async def create_admin_user():
    """Create default admin user if not exists"""
    
    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        try:
            # Check if admin already exists
            stmt = select(AdminUser).where(AdminUser.email == "admin@chatlegislativ.ro")
            result = await session.execute(stmt)
            existing_admin = result.scalar_one_or_none()
            
            if existing_admin:
                print("✅ Admin user already exists!")
                return
            
            # Create new admin user
            password = "admin123"  # Default password - CHANGE IN PRODUCTION!
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            admin_user = AdminUser(
                email="admin@chatlegislativ.ro",
                password_hash=password_hash,
                full_name="Administrator",
                role="admin",
                is_active=True
            )
            
            session.add(admin_user)
            await session.commit()
            
            print("✅ Admin user created successfully!")
            print("📧 Email: admin@chatlegislativ.ro")
            print("🔑 Password: admin123")
            print("⚠️  IMPORTANT: Change password after first login!")
            
        except Exception as e:
            print(f"❌ Error creating admin user: {e}")
            await session.rollback()
        finally:
            await engine.dispose()

if __name__ == "__main__":
    print("🚀 Initializing admin user...")
    asyncio.run(create_admin_user())