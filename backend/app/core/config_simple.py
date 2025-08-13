from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Database - Railway va furniza automat DATABASE_URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./chat_legislativ.db")
    
    # Redis - Railway va furniza automat REDIS_URL
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Pentru dezvoltare - vom foloza un LLM simplu
    OLLAMA_URL: str = "http://localhost:11434"  # Nu va fi folosit în producție
    OLLAMA_MODEL: str = "gemma2:2b"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "railway-production-secret-key-2025")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "jwt-secret-2025")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    
    # Application
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    LOG_LEVEL: str = "INFO"
    
    # CORS - permisiv pentru testare
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # File upload
    MAX_FILE_SIZE: int = 50_000_000
    UPLOAD_DIRECTORY: str = "./uploads"
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "doc", "docx", "txt"]
    
    # AI Configuration - simplificat pentru Railway
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 300
    CHUNK_OVERLAP: int = 30
    MAX_TOKENS: int = 512
    SIMILARITY_THRESHOLD: float = 0.0
    MAX_RESULTS: int = 3
    
    # Port pentru Railway
    PORT: int = int(os.getenv("PORT", "8000"))
    
    class Config:
        case_sensitive = True

# Create global settings instance
settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs("logs", exist_ok=True)