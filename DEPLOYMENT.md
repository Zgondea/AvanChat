# 🚀 AvanChat Deployment Guide

## 📋 Prerequisites

- Docker & Docker Compose
- Git
- 4GB+ RAM recommended
- Port 80, 443, 5432, 6379, 8000, 11434 available

## 🔧 Quick Deployment Steps

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd AvanChat
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your settings
nano .env
```

### 3. Start Services
```bash
# Start all services
docker-compose up -d

# Wait for services to be ready (2-3 minutes)
docker-compose logs -f
```

### 4. Initialize Database & Admin
```bash
# Run initialization script
./scripts/init_db.sh
```

### 5. Access Application
- **Frontend**: http://your-domain
- **Admin Panel**: http://your-domain/admin
- **API**: http://your-domain/api/v1

## 🔐 Default Login Credentials

```
Email: admin@chatlegislativ.ro
Password: admin123
```

**⚠️ IMPORTANT: Change password immediately after first login!**

## 📁 Key Configuration Files

- `docker-compose.yml` - Main services configuration
- `nginx/nginx.conf` - Web server configuration  
- `backend/app/core/config.py` - Application settings
- `.env` - Environment variables

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Admin Login Problems
```bash
# Recreate admin user
docker-compose exec backend python /app/scripts/init_admin.py
```

### Widget Not Loading
```bash
# Check nginx configuration
docker-compose logs nginx

# Restart web server
docker-compose restart nginx
```

### Chat API Errors
```bash
# Check backend logs
docker-compose logs backend

# Check Ollama status
docker-compose logs ollama

# Restart backend
docker-compose restart backend
```

## 🔄 Updates & Maintenance

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild services
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

### Backup Database
```bash
# Create database backup
docker-compose exec postgres pg_dump -U postgres chat_legislativ > backup_$(date +%Y%m%d).sql
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f ollama
```

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│    Nginx    │ -> │   Frontend   │    │   Backend   │
│  (Port 80)  │    │   (React)    │    │  (FastAPI)  │
└─────────────┘    └──────────────┘    └─────────────┘
                                              │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Redis     │    │ PostgreSQL   │    │   Ollama    │
│  (Cache)    │    │ (Database)   │    │    (AI)     │
└─────────────┘    └──────────────┘    └─────────────┘
```

## 📞 Support

Pentru probleme sau întrebări:
1. Check logs: `docker-compose logs`
2. Restart services: `docker-compose restart`
3. Check this guide for common solutions

## 🎯 Production Considerations

- [ ] Change default admin password
- [ ] Configure SSL certificates
- [ ] Set up proper backups  
- [ ] Configure monitoring
- [ ] Update environment variables
- [ ] Configure proper domains
- [ ] Set up log rotation