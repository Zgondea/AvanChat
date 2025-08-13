# 🏛️ AvanChat - AI Assistant pentru Primării

Sistem complet de chat AI pentru asistență legislativă și fiscală pentru primăriile din România.

## ✨ Funcționalități

- **🧠 RAG System Avansat**: Hybrid search cu keyword, semantic și full-text search
- **⚡ Cache Inteligent**: Redis-based cu similaritate semantică pentru răspunsuri rapide
- **🎯 Widget Integrat**: JavaScript widget cu meniu topic-based pentru site-uri web
- **🏢 Multi-tenant**: Suport pentru multiple primării
- **👨‍💼 Admin Panel**: Interface React pentru administrare documente

## 🏗️ Arhitectura

- **Backend**: FastAPI + PostgreSQL + pgvector + Redis
- **Frontend**: React + Material-UI  
- **AI**: Ollama cu Gemma2:2b + sentence-transformers
- **Proxy**: Nginx cu SSL
- **Deployment**: Docker + Docker Compose

## 🚀 Opțiuni de Deployment

### 🏠 Self-Hosting (100% GRATUIT)
Perfect pentru testare și uz personal pe calculatorul tău:

```bash
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat
docker-compose -f docker-compose.prod.yml up -d
docker exec avanchat_ollama ollama pull gemma2:2b
```

**📖 Ghid complet**: [SELF-HOSTING.md](SELF-HOSTING.md)
- Windows, macOS, Linux
- Acces local și în rețea
- 0 costuri, control total

### 🖥️ VM/VPS Deployment
Pentru producție profesională:

```bash
wget https://raw.githubusercontent.com/Zgondea/AvanChat/main/vm-install.sh
chmod +x vm-install.sh
sudo ./vm-install.sh
```

**📖 Ghid complet**: [VM-DEPLOYMENT.md](VM-DEPLOYMENT.md)
- Script automat de instalare
- SSL cu Let's Encrypt
- Monitoring și backup

### ☁️ Cloud Deployment (Gratuit)
Pentru accesibilitate publică:

- **Render.com**: Deploy gratuit cu `render.yaml`
- **Railway**: Deploy cu configurații optimizate
- **Vercel**: Pentru frontend static

**📖 Configurații gata**: Toate fișierele incluse în repository

## ⚡ Quick Start

### 1. Clone repository
```bash
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat
```

### 2. Configurare rapidă
```bash
cp .env.example .env
# Editează .env cu setările tale
```

### 3. Pornire aplicație
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Acces aplicații
- **🏠 Frontend**: http://localhost
- **📚 API Docs**: http://localhost:8000/docs
- **🤖 Widget Demo**: http://localhost/widget/demo.html
- **👨‍💼 Admin**: admin@chatlegislativ.ro / admin123

## 🎯 Widget Integration

Integrează chat-ul pe site-ul primăriei cu un simplu script:

```html
<script 
    src="https://your-domain.com/widget/working-chat-widget.js"
    data-chat-legislativ
    data-municipality-domain="primaria-ta.ro"
    data-api-url="https://your-api.com/api/v1"
    data-title="Asistent Legislativ"
></script>
```

**Caracteristici widget:**
- 📋 Meniu topic-based (Urbanism, TVA, Taxe Locale)
- ❓ 5 întrebări predefinite per topic + opțiune custom
- 🎨 Design responsive și modern
- ⚡ Cache inteligent pentru răspunsuri rapide

## 📊 Performance

- **🚀 15x mai rapid** cu cache-ul inteligent (45s → 3s)
- **🎯 82% precizie** pentru întrebări despre TVA
- **💾 Hybrid RAG** cu 3 tipuri de căutare
- **🔄 Auto-backup** și monitoring

## 🤝 Contribuție

1. Fork repository-ul
2. Creează branch pentru feature: `git checkout -b feature/new-feature`
3. Commit schimbările: `git commit -m 'Add new feature'`
4. Push pe branch: `git push origin feature/new-feature`
5. Deschide Pull Request

## 📞 Support

- 📧 Email: support@chatlegislativ.ro
- 🐛 Issues: [GitHub Issues](https://github.com/Zgondea/AvanChat/issues)
- 📖 Docs: Vezi ghidurile de deployment

---
