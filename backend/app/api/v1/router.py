from fastapi import APIRouter

from app.api.v1.endpoints import chat, municipalities, documents, admin, conversations

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(municipalities.router, prefix="/municipalities", tags=["municipalities"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])