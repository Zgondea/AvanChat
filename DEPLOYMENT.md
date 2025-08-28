# 🚀 AvanChat - Deployment Automat

## ⚡ Setup în 30 de secunde!

### 🎯 **One-Command Deploy**

```bash
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat
docker-compose up --build

# Gata! 🎉 Tot ce ai nevoie se instalează automat:
# ✅ PostgreSQL cu baza de date creată
# ✅ Admin user: admin@chatlegislativ.ro / admin123
# ✅ Redis cache configurat
# ✅ Frontend React servit de Nginx
# ✅ Backend API functional
# ✅ Model AI Ollama pregătit
# ✅ Widget chat disponibil
```

### 🌐 **Acces Aplicație**

- **🏠 Frontend**: http://localhost
- **👤 Admin Panel**: http://localhost/admin  
- **🔧 API Docs**: http://localhost:8000/docs
- **💬 Widget Demo**: http://localhost/municipality-demo

## 🔧 Advanced Setup (Opțional)

### 🏭 **Pentru Producție**

```bash
# Cu SSL și optimizări
docker-compose -f docker-compose.prod.yml up --build -d

# Sau cu configurare personalizată
cp .env.example .env
# Editează parolele și domeniile
nano .env
docker-compose -f docker-compose.prod.yml up --build -d
```

### 🤖 **Instalare Model AI (Opțional)**

```bash
# Model român optimizat (recomandat)
docker exec chat_legislativ_ollama ollama pull gemma2:2b

# Sau model mai mare și mai precis
docker exec chat_legislativ_ollama ollama pull llama3.1:8b
```

## 🔐 Login Info

```
📧 Email: admin@chatlegislativ.ro  
🔑 Password: admin123
```

**⚠️ Schimbă parola la primul login!**

## 🛠️ Ce Se Întâmplă Automat

### 📦 **Servicii Create**

1. **PostgreSQL** - Baza de date cu toate tabelele
2. **Redis** - Cache pentru performance
3. **Ollama** - Model AI local
4. **Backend** - API FastAPI
5. **Frontend** - React app
6. **Nginx** - Web server + proxy

### 🗄️ **Baza de Date**

```sql
-- Tabelele create automat:
✅ admin_users (user admin)
✅ municipalities (primării)
✅ documents (documente procesate) 
✅ conversations (conversații chat)
✅ + pgvector extension pentru AI
```

### 👤 **Admin User**

```bash
# Creat automat cu:
- Email: admin@chatlegislativ.ro
- Parola: admin123  
- Rol: super_admin
- Status: activ
```

## 🔍 Verificare Status

```bash
# Vezi toate serviciile
docker-compose ps

# Logs în timp real
docker-compose logs -f

# Status specific
docker-compose logs backend
docker-compose logs postgres
docker-compose logs ollama
```

## 🐛 Troubleshooting

### ❌ **Servicii nu pornesc**
```bash
# Restart complet
docker-compose down
docker-compose up --build

# Verifică porturile
netstat -tulpn | grep :80
```

### 🔌 **API nu răspunde**
```bash
# Verifică backend
curl http://localhost:8000/api/v1/health

# Logs backend
docker-compose logs backend
```

### 🤖 **AI nu funcționează**
```bash
# Verifică Ollama
curl http://localhost:11434

# Instalează model
docker exec chat_legislativ_ollama ollama pull gemma2:2b
```

### 🗄️ **Baza de date nu se conectează**
```bash
# Verifică PostgreSQL
docker-compose exec postgres psql -U postgres -d chat_legislativ -c "\dt"

# Recreează baza de date
docker-compose down -v
docker-compose up --build
```

## 🔄 Updates

```bash
# Pull latest
git pull origin main

# Rebuild tot
docker-compose down
docker-compose up --build

# Sau doar serviciile schimbate
docker-compose build backend frontend
docker-compose up -d
```

## 💾 Backup & Restore

### Backup
```bash
# Database backup
docker-compose exec postgres pg_dump -U postgres chat_legislativ > backup_$(date +%Y%m%d).sql

# Full backup cu volume-uri
docker-compose down
sudo tar -czf avanchat_backup_$(date +%Y%m%d).tar.gz .
```

### Restore  
```bash
# Database restore
docker-compose exec -T postgres psql -U postgres chat_legislativ < backup_20240101.sql

# Full restore
tar -xzf avanchat_backup_20240101.tar.gz
docker-compose up --build
```

## 🌐 Domain & SSL Setup

### Custom Domain
```bash
# Editează nginx config
nano nginx/nginx.conf
# Schimbă server_name cu domeniul tău

# Restart nginx
docker-compose restart nginx
```

### SSL cu Let's Encrypt
```bash
# Instalează certbot
sudo apt install certbot

# Generează certificat
sudo certbot certonly --standalone -d yourdomain.com

# Updatează nginx config cu SSL
# Restart services
docker-compose restart nginx
```

## 📊 Monitoring

```bash
# Resource usage
docker stats

# Service health
curl http://localhost:8000/api/v1/health
curl http://localhost:11434

# Database connections
docker-compose exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

## 🎯 Production Checklist

- [ ] ✅ Aplicația pornește automat cu `docker-compose up --build`
- [ ] 🔑 Parola admin schimbată de la `admin123`
- [ ] 🌐 Domain configurat în nginx  
- [ ] 🔒 SSL certificat instalat
- [ ] 💾 Backup automated configurat
- [ ] 📊 Monitoring setat (opcional)
- [ ] 🚨 Log rotation configurat
- [ ] 🔥 Firewall configurat (doar porturile necesare)

## 🆘 Support

### 📞 **Probleme Comune**

1. **"Port 80 already in use"** → Oprește Apache/nginx local
2. **"Cannot connect to database"** → Așteaptă 2-3 minute pentru inițializare
3. **"Admin login failed"** → Parola este `admin123` (nu `admin`)
4. **"Widget not loading"** → Verifică `http://localhost/widget/`

### 🔍 **Debugging**

```bash
# Health check complet
curl http://localhost:8000/api/v1/health
curl http://localhost:11434
curl http://localhost/widget/widget.js

# Testează baza de date
docker-compose exec postgres psql -U postgres -d chat_legislativ -c "SELECT COUNT(*) FROM admin_users;"
```

---

**Deploymentul automat funcționează pe orice mașină cu Docker! 🚀**

Pentru probleme: [GitHub Issues](https://github.com/Zgondea/AvanChat/issues)