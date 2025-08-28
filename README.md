# 🏛️ AvanChat - AI Assistant pentru Primării

**Sistem complet de chat AI pentru asistență legislativă și fiscală pentru primăriile din România.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

---

## 🌟 Funcționalități Cheie

### 🤖 **AI & NLP**
- **RAG System Hibrid**: Căutare semantică + keyword + full-text pentru răspunsuri precise
- **Cache Inteligent**: Redis cu similaritate semantică (15x mai rapid: 45s → 3s)
- **Ollama Integration**: Model Gemma2:2b optimizat pentru română
- **Document Processing**: Suport PDF, DOCX, TXT cu embeddings vectoriali
- **URL Scraping**: Procesare automată documente de pe ANAF, primării

### 💻 **Interfețe Moderne**
- **Admin Dashboard Professional**: Design modern cu statistici real-time
- **Widget Chat Inteligent**: Meniu topic-based cu mesaj de întâmpinare
- **Responsive Design**: Optimizat pentru desktop, tablet și mobile
- **Dark/Light Mode**: Interfață adaptabilă

### 🏢 **Enterprise Features**
- **Multi-tenant**: Suport pentru multiple primării (Sector 1-6, județe)
- **Conversații Management**: Vizualizare, ștergere, analytics
- **Document Management**: Upload, organizare, bulk operations
- **Real-time Analytics**: Statistici utilizare și performance

### 🔧 **Technical Excellence**
- **Microservices Architecture**: FastAPI + React + PostgreSQL + Redis + Nginx
- **Vector Database**: pgvector pentru căutare semantică
- **Docker Deployment**: Production-ready cu SSL
- **API Documentation**: Swagger/OpenAPI auto-generated

---

## 🏗️ Arhitectura Sistemului

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   🌐 Nginx      │    │   ⚛️  React      │    │  🐍 FastAPI     │
│   Reverse Proxy │◄───┤   Admin Panel    │◄───┤   Backend API   │
│   SSL/HTTPS     │    │   Dashboard      │    │   + Ollama      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  📱 Chat Widget │    │   🗄️ PostgreSQL  │    │   🔴 Redis      │
│   JavaScript    │    │   + pgvector     │◄───┤   Cache Layer   │
│   Embedded      │    │   Vector DB      │    │   Sessions      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 🚀 Quick Start

### 🐳 **Docker Deployment (Recomandat)**

```bash
# 1. Clone repository
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat

# 2. Configurare environment
cp .env.example .env
# Editează .env cu setările tale

# 3. Pornire servici
docker-compose -f docker-compose.prod.yml up -d

# 4. Instalare model AI
docker exec chat_legislativ_ollama ollama pull gemma2:2b

# 5. Acces aplicație
# Frontend: http://localhost
# Admin: admin@chatlegislativ.ro / admin123
```

### 💻 **Development Setup**

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend  
cd frontend
npm install
npm start

# Widget Demo
cd widget
python3 -m http.server 8888
```

---

## 🎯 Widget Integration

### 📱 **Modern Chat Widget**

Integrează asistentul AI pe orice site cu un simplu script:

```html
<script 
    src="https://your-domain.com/widget/widget.js"
    data-chat-legislativ
    data-municipality-domain="primaria-ta.ro"
    data-api-url="https://your-api.com/api/v1"
    data-title="Asistent Legislativ"
    data-primary-color="#1976d2"
></script>
```

### ✨ **Funcționalități Widget**

- **🎨 Mesaj de Întâmpinare**: "Bună ziua! Sunt aici să vă ajut cu orice întrebare"
- **📋 6 Categorii**: Urbanism, Taxe Locale, TVA, Impozite, Contribuții, Proceduri
- **💬 Chat Inteligent**: Răspunsuri contextualizate cu surse
- **📱 Responsive**: Design adaptat pentru toate dispozitivele
- **🎭 Iconițe Custom**: Design profesional cu PNG-uri optimizate
- **⚡ Performance**: Cache și loading states

---

## 📊 Dashboard Admin

### 🎛️ **Panoul de Control Modern**

- **📈 Analytics Real-time**: Conversații, utilizatori, documente procesate
- **💬 Management Conversații**: Vizualizare, căutare, ștergere
- **📄 Management Documente**: Upload, categorizare, bulk operations
- **🏢 Multi-primării**: Gestionare Sector 1-6, județe
- **📊 Grafice Interactive**: Statistici vizuale cu Recharts
- **⚙️ System Health**: Monitorizare Ollama, Redis, PostgreSQL

### 🔐 **Acces Admin**
- **URL**: `http://localhost/admin`
- **Demo**: `admin@chatlegislativ.ro` / `admin123`

---

## 🎛️ API Endpoints

### 🔗 **Core APIs**

```bash
# Chat & AI
POST /api/v1/chat                 # Send message
GET  /api/v1/chat/health          # AI status

# Documents  
GET    /api/v1/documents          # List documents
POST   /api/v1/documents/upload   # Upload file
POST   /api/v1/documents/add-url  # Add from URL

# Conversations
GET    /api/v1/conversations      # List conversations  
DELETE /api/v1/conversations/{id} # Delete conversation

# Admin
GET /api/v1/dashboard/dashboard   # Stats overview
GET /api/v1/municipalities        # List municipalities
```

### 📚 **API Documentation**
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 🚀 Deployment Options

### 🏠 **Self-Hosting (100% GRATUIT)**

Perfect pentru testare și uz personal:

```bash
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat
docker-compose -f docker-compose.prod.yml up -d
```

**Beneficii**:
- ✅ Control total asupra datelor
- ✅ Zero costuri operaționale  
- ✅ Customizare completă
- ✅ Acces în rețeaua locală

### ☁️ **Cloud Deployment**

Pentru accesibilitate publică:

#### **Railway** (Recomandat)
```bash
# Deploy cu un click
railway up
```

#### **Render.com**
```yaml
# render.yaml inclus în repository
```

#### **VPS/VM Deployment**
```bash
# Script automat pentru Ubuntu/CentOS
wget https://raw.githubusercontent.com/Zgondea/AvanChat/main/vm-install.sh
chmod +x vm-install.sh
sudo ./vm-install.sh
```

---

## 📈 Performance & Scalability

### ⚡ **Optimizări Implementate**

- **🚀 15x Mai Rapid**: Cache Redis cu similaritate semantică
- **🎯 85%+ Acuratețe**: RAG hibrid cu 3 tipuri de căutare
- **💾 Memory Efficient**: Streaming responses, lazy loading
- **🔄 Auto-scaling**: Docker Compose cu resource limits
- **📊 Monitoring**: Health checks pentru toate serviciile

### 📊 **Benchmark Results**

| Metric | Fără Cache | Cu Cache | Îmbunătățire |
|--------|------------|----------|--------------|
| Response Time | 45s | 3s | **15x** |
| CPU Usage | 85% | 25% | **3.4x** |
| Memory Usage | 2GB | 800MB | **2.5x** |
| Concurrent Users | 10 | 50+ | **5x** |

---

## 🛠️ Development

### 📋 **Requirements**

- **Python**: 3.11+
- **Node.js**: 18+
- **Docker**: 24+
- **PostgreSQL**: 15+
- **Redis**: 7+

### 🔧 **Tech Stack**

**Backend**:
- FastAPI (Python)
- PostgreSQL + pgvector
- Redis (cache & sessions)
- Ollama (AI model)
- BeautifulSoup (web scraping)

**Frontend**:
- React 18
- Material-UI v5
- React Query
- Recharts (analytics)

**Infrastructure**:
- Nginx (proxy + SSL)
- Docker + Docker Compose
- GitHub Actions (CI/CD)

### 🧪 **Testing**

```bash
# Backend tests
cd backend
pytest

# Frontend tests  
cd frontend
npm test

# Widget tests
cd widget
python3 -m http.server 8888
# Open http://localhost:8888/test.html
```

---

## 🎨 Customization

### 🎯 **Widget Theming**

```javascript
// Custom colors & branding
<script src="widget.js"
    data-primary-color="#1976d2"
    data-title="Asistent Custom"
    data-welcome-message="Mesajul tău personalizat">
</script>
```

### 🏢 **Multi-primării Setup**

```python
# backend/app/core/config.py
MUNICIPALITIES = [
    {"name": "Sector 1", "domain": "sector1.ro"},
    {"name": "Sector 2", "domain": "sector2.ro"},
    {"name": "Primăria Cluj", "domain": "primariacluj.ro"}
]
```

---

## 📚 Documentation

- **🚀 [Quick Start Guide](docs/quick-start.md)**: Start în 5 minute
- **🐳 [Docker Guide](docs/docker-setup.md)**: Production deployment  
- **🎯 [Widget Integration](docs/widget-integration.md)**: Embedding pe site-uri
- **🔧 [API Reference](docs/api-reference.md)**: Toate endpoint-urile
- **⚙️ [Configuration](docs/configuration.md)**: Environment variables
- **🐛 [Troubleshooting](docs/troubleshooting.md)**: Rezolvarea problemelor

---

## 🤝 Contributing

Contribuțiile sunt binevenite! 

### 📝 **Process**

1. **Fork** repository-ul
2. **Clone** fork-ul tău: `git clone https://github.com/YOUR-USERNAME/AvanChat.git`
3. **Create branch**: `git checkout -b feature/amazing-feature`
4. **Commit**: `git commit -m 'Add amazing feature'`
5. **Push**: `git push origin feature/amazing-feature`
6. **Pull Request**: Deschide PR pe GitHub

### 🏷️ **Commit Convention**

```
feat: add new feature
fix: bug fix
docs: update documentation
style: code formatting
refactor: code restructuring
test: add tests
```

---

## 📞 Support & Community

### 💬 **Getting Help**

- **🐛 Issues**: [GitHub Issues](https://github.com/Zgondea/AvanChat/issues)
- **📧 Email**: support@chatlegislativ.ro
- **💬 Discussions**: [GitHub Discussions](https://github.com/Zgondea/AvanChat/discussions)

### 🎯 **Feature Requests**

Hai să construim împreună viitorul administrației publice digitale!

---

## 📄 License

Acest proiect este licențiat sub **MIT License** - vezi [LICENSE](LICENSE) pentru detalii.

---

## 🏆 Acknowledgments

- **🤖 Ollama**: Pentru modelul AI local
- **🧠 Sentence Transformers**: Pentru embeddings
- **⚛️ React & FastAPI**: Pentru stack-ul modern
- **🐳 Docker**: Pentru deployment simplu
- **🏛️ Administrația Publică**: Pentru inspirația de a digitaliza serviciile

---

<div align="center">

**Făcut cu ❤️ pentru digitalizarea administrației publice din România**

[⭐ Star](https://github.com/Zgondea/AvanChat) • [🐛 Report Bug](https://github.com/Zgondea/AvanChat/issues) • [💡 Request Feature](https://github.com/Zgondea/AvanChat/issues)

</div>