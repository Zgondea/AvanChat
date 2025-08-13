#!/usr/bin/env python3
"""
Script simplu pentru crearea unui user admin
"""
import asyncio
import asyncpg
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    # Connect direct la PostgreSQL
    conn = await asyncpg.connect("postgresql://postgres:postgres123@localhost:5432/chat_legislativ")
    
    try:
        # Check dacă există tabela și admin-ul
        existing = await conn.fetchrow(
            "SELECT id FROM admin_users WHERE email = 'admin@chatlegislativ.ro'"
        )
        
        if existing:
            print("❌ Admin user deja există!")
            return
        
        # Hash password
        password_hash = pwd_context.hash("admin123")
        admin_id = str(uuid.uuid4())
        
        # Insert admin user
        await conn.execute("""
            INSERT INTO admin_users (id, email, password_hash, full_name, role, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
        """, admin_id, "admin@chatlegislativ.ro", password_hash, "Administrator", "super_admin", True)
        
        print("✅ Admin user creat cu succes!")
        print("📧 Email: admin@chatlegislativ.ro")
        print("🔐 Parola: admin123")
        
    except Exception as e:
        print(f"❌ Eroare: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(create_admin())