from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from datetime import datetime
import uuid

from app.models.database import get_db, engine
from app.models import models
from app.api import chat, documents, municipalities
from app.services.ai_service import AIService
from app.services.document_service import DocumentService

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AvanChat - Romanian Legislative AI",
    description="AI-powered chat widget for Romanian municipalities",
    version="1.0.0"
)

## CORS este gestionat de nginx, nu de FastAPI
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Allow all origins for widget integration
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# Initialize services
ai_service = AIService()
document_service = DocumentService()

# Include routers
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(municipalities.router, prefix="/api", tags=["municipalities"])

# Import analytics router
from app.api import analytics
app.include_router(analytics.router, prefix="/api", tags=["analytics"])

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        await ai_service.initialize()
        print("✅ AI Service initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize AI Service: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)