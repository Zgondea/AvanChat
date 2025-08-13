from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router
from app.services.ollama_service import OllamaService
from app.services.embedding_service import EmbeddingService

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Chat Legislativ application...")
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize services in background to avoid blocking startup
    try:
        ollama_service = OllamaService()
        embedding_service = EmbeddingService()
        
        # Wait for Ollama to be ready and pull model if needed (with timeout)
        import asyncio
        try:
            await asyncio.wait_for(ollama_service.ensure_model_ready(), timeout=60.0)
        except asyncio.TimeoutError:
            logger.warning("Ollama initialization timed out, will continue in background")
        
        # Initialize embedding model (with timeout)
        try:
            await asyncio.wait_for(embedding_service.initialize(), timeout=120.0)
        except asyncio.TimeoutError:
            logger.warning("Embedding service initialization timed out, will continue in background")
            
    except Exception as e:
        logger.error(f"Error during service initialization: {e}")
        # Don't block startup if services fail to initialize
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await ollama_service.close()
    await embedding_service.close()
    logger.info("Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Chat Legislativ API",
    description="API pentru sistemul de chat AI legislativ pentru primării",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

# CORS configurat în Nginx - nu mai adaugăm aici

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check endpoint"""
    health_status = {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "services": {}
    }
    
    # Check database connection
    try:
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        health_status["services"]["database"] = "healthy"
    except Exception as e:
        health_status["services"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Ollama service
    try:
        ollama_service = OllamaService()
        if await ollama_service.is_ready():
            health_status["services"]["ollama"] = "healthy"
        else:
            health_status["services"]["ollama"] = "unhealthy"
            health_status["status"] = "degraded"
        await ollama_service.close()
    except Exception as e:
        health_status["services"]["ollama"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Chat Legislativ API",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development"
    )