from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os

# Create FastAPI app
app = FastAPI(
    title="AvanChat API",
    description="API pentru chat AI legislativ - versiune simplificată",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "AvanChat API - Ready for deployment!", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": os.getenv("ENVIRONMENT", "development")}

# Chat endpoint simplificat pentru demo
@app.post("/api/v1/chat/")
async def chat_demo(request: dict):
    message = request.get("message", "")
    
    # Răspunsuri demo pentru testare
    demo_responses = {
        "care este cota standard de tva": "Cota standard de TVA în România este de 19% începând cu 1 ianuarie 2024.",
        "cum calculez taxa pe cladiri": "Taxa pe clădiri se calculează în funcție de valoarea impozabilă și cota stabilită de consiliul local.",
        "ce documente trebuie pentru autorizatie": "Pentru autorizația de construire aveți nevoie de: planul de amplasament, proiectul tehnic, și avizele necesare."
    }
    
    # Caută răspuns demo
    message_lower = message.lower()
    response = "Îmi pare rău, momentan sunt în modul demo. Pentru răspunsuri complete, contactați primăria direct."
    
    for key, value in demo_responses.items():
        if key in message_lower:
            response = value
            break
    
    return {
        "response": response,
        "sources": [{"document_name": "Demo Mode", "page_number": 1}],
        "confidence": 0.8,
        "session_id": "demo",
        "municipality": {"name": "Demo Municipality"}
    }

@app.get("/api/v1/chat/municipalities")
async def get_municipalities():
    return [
        {
            "id": "demo",
            "name": "Primăria Demo", 
            "domain": "demo.ro",
            "description": "Primărie demo pentru testare"
        }
    ]

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main_simple:app", host="0.0.0.0", port=port)