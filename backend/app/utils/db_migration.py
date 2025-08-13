import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def ensure_error_message_column():
    db_url = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(
        db_url,
        echo=False
    )
    async with engine.begin() as conn:
        # Check if column exists
        result = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name='documents' AND column_name='error_message';
        """))
        exists = result.scalar() is not None
        if not exists:
            await conn.execute(text("ALTER TABLE documents ADD COLUMN error_message TEXT;"))
            print("✅ Added error_message column to documents table.")
        else:
            print("ℹ️ error_message column already exists.")

if __name__ == "__main__":
    asyncio.run(ensure_error_message_column())
