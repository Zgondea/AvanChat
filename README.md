# Chat Legislativ - AI Assistant pentru Primării

Sistem complet de chat AI pentru asistență legislativă și fiscală pentru primăriile din România.

## 🚀 Funcționalități

- **RAG System Avansat**: Hybrid search cu keyword, semantic și full-text search
- **Cache Inteligent**: Redis-based cu similaritate semantică pentru răspunsuri rapide
- **Widget Integrat**: JavaScript widget pentru site-uri web
- **Multi-tenant**: Suport pentru multiple primării
- **Admin Panel**: Interface React pentru administrare

## 🏗️ Arhitectura

- **Backend**: FastAPI + PostgreSQL + pgvector + Redis
- **Frontend**: React + Material-UI  
- **AI**: Ollama cu Gemma2:2b + sentence-transformers
- **Proxy**: Nginx
- **Deployment**: Docker + Docker Compose

## 🚀 Deploy Rapid

### 1. Clone și configurare
```bash
git clone https://github.com/yourusername/chat-legislativ.git
cd chat-legislativ
```

### 2. Start cu Docker
```bash
docker-compose up -d
```

### 3. Acces aplicație
- **Admin Panel**: http://localhost
- **API Docs**: http://localhost/docs
- **Widget Demo**: http://localhost/widget/demo.html

## 📋 Configurare Widget

```html
<script 
    src="https://your-domain.com/widget/working-chat-widget.js"
    data-chat-legislativ
    data-municipality-domain="primaria-ta.ro"
    data-api-url="https://your-api.com/api/v1"
    data-title="Asistent Fiscal"
></script>
```

🤖 Generat cu [Claude Code](https://claude.ai/code)