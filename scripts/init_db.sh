#!/bin/bash
# Script de inițializare pentru baza de date și admin user
# Rulează după primul deploy

echo "🚀 Initializing AvanChat database..."

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
docker-compose exec backend alembic upgrade head

# Create admin user
echo "👤 Creating admin user..."
docker-compose exec backend python /app/scripts/init_admin.py

# Create sample municipality if needed
echo "🏛️ Creating sample municipality..."
docker-compose exec backend python -c "
import asyncio
import sys
sys.path.append('/app')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.municipality import Municipality
from app.core.config import settings

async def create_sample_municipality():
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(Municipality).where(Municipality.domain == 'pmb.ro')
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if not existing:
                municipality = Municipality(
                    name='Primăria Municipiului București',
                    domain='pmb.ro',
                    description='Primăria Municipiului București - Demo',
                    contact_email='contact@pmb.ro',
                    contact_phone='021-9541',
                    address='Bd. Regina Elisabeta nr. 5, București',
                    is_active=True
                )
                session.add(municipality)
                await session.commit()
                print('✅ Sample municipality created!')
            else:
                print('✅ Municipality already exists!')
                
        except Exception as e:
            print(f'❌ Error: {e}')
        finally:
            await engine.dispose()

asyncio.run(create_sample_municipality())
"

echo "✅ Database initialization complete!"
echo ""
echo "🔐 Admin Login Details:"
echo "📧 Email: admin@chatlegislativ.ro"
echo "🔑 Password: admin123"
echo ""
echo "⚠️  IMPORTANT: Change password after first login!"
echo "🌐 Access admin panel at: http://your-domain/admin"