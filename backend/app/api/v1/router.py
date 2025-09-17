from fastapi import APIRouter

from app.api.v1.endpoints import chat, municipalities, documents, admin, conversations, auth, favorites, notifications
from app.api.v1 import laws

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(municipalities.router, prefix="/municipalities", tags=["municipalities"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(admin.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(laws.router, prefix="/laws", tags=["laws"])
api_router.include_router(favorites.router, prefix="/favorites", tags=["favorites"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])