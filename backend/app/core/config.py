from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres123@postgres:5432/chat_legislativ"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Ollama
    OLLAMA_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "gemma2:2b"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    JWT_SECRET_KEY: str = "your-jwt-secret-key-here"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    
    # Application
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    # CORS - doar o valoare pentru a evita conflictele
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # File upload
    MAX_FILE_SIZE: int = 50_000_000  # 50MB
    UPLOAD_DIRECTORY: str = "./uploads"
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "doc", "docx", "txt"]
    
    # AI Configuration
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 300
    CHUNK_OVERLAP: int = 30
    MAX_TOKENS: int = 512
    SIMILARITY_THRESHOLD: float = 0.0
    MAX_RESULTS: int = 3
    
    # Romanian language specific
    ROMANIAN_STOPWORDS: List[str] = [
        "a", "am", "ar", "are", "as", "au", "avea", "avut", "ca", "căci", "când", 
        "care", "ce", "cel", "cea", "cei", "cele", "cu", "cum", "dar", "de", 
        "din", "fiind", "fi", "fie", "fii", "fim", "fiți", "pentru", "peste", 
        "prin", "să", "se", "și", "un", "una", "unei", "unor", "în", "între", 
        "la", "le", "li", "lor", "lui", "ma", "mă", "meu", "mea", "mei", "mele",
        "pe", "po", "pot", "poate", "să", "se", "sunt", "te", "tu", "va", "vor"
    ]
    
    class Config:
        env_file = "../../.env"
        case_sensitive = True

# Create global settings instance
settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs("logs", exist_ok=True)