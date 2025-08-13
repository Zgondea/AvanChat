# 🖥️ VM Deployment Guide - AvanChat

Ghid complet pentru deploy pe VM/VPS (Ubuntu, CentOS, Debian).

## 📋 Cerințe Minime

- **RAM**: 4GB (recomandat 8GB+)
- **Storage**: 20GB liberi 
- **OS**: Ubuntu 20.04+, CentOS 7+, Debian 10+
- **Network**: Acces SSH și porturi 80, 443 deschise

## 🚀 Instalare Automată (Opțiunea 1)

### Pas 1: Download și rulare script

```bash
# Pe serverul tău VM
wget https://raw.githubusercontent.com/Zgondea/AvanChat/main/vm-install.sh
chmod +x vm-install.sh
sudo ./vm-install.sh
```

### Pas 2: Configurare domeniu (opțional)
```bash
# Editează .env cu domeniul tău
nano .env

# Configurare SSL pentru domeniu
./setup-ssl.sh yourdomain.com admin@yourdomain.com
```

### Pas 3: Pornire aplicație
```bash
./manage.sh start
./manage.sh setup-ollama  # Instalare model AI (poate dura 5-10 min)
```

## ⚙️ Instalare Manuală (Opțiunea 2)

### Pas 1: Pregătire server

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# sau
sudo yum update -y  # CentOS

# Instalare dependențe
sudo apt install -y curl wget git unzip docker.io docker-compose
# sau
sudo yum install -y curl wget git unzip docker docker-compose
```

### Pas 2: Configurare Docker

```bash
# Pornire Docker
sudo systemctl start docker
sudo systemctl enable docker

# Adaugare user la grupul docker
sudo usermod -aG docker $USER
newgrp docker  # sau logout/login
```

### Pas 3: Clone repository

```bash
# Creare director aplicație
sudo mkdir -p /opt/avanchat
cd /opt/avanchat

# Clone repository
git clone https://github.com/Zgondea/AvanChat.git .

# Setare permisiuni
sudo chown -R $USER:$USER /opt/avanchat
chmod +x *.sh
```

### Pas 4: Configurare environment

```bash
# Creare fișier .env
cp .env.example .env
nano .env
```

Editează `.env`:
```env
# Database
POSTGRES_PASSWORD=your_secure_db_password
REDIS_PASSWORD=your_secure_redis_password

# App
SECRET_KEY=your_super_secret_key_here
ENVIRONMENT=production
DEBUG=false

# Domain (opțional pentru SSL)
DOMAIN=yourdomain.com
SSL_EMAIL=admin@yourdomain.com
```

### Pas 5: Pornire aplicație

```bash
# Pornire în background
docker-compose -f docker-compose.prod.yml up -d

# Verificare status
docker-compose -f docker-compose.prod.yml ps

# Instalare model AI (poate dura câteva minute)
docker exec avanchat_ollama ollama pull gemma2:2b
```

## 🔧 Comenzi de Management

Folosește scriptul `manage.sh` pentru administrare:

```bash
# Status aplicație
./manage.sh status

# Pornire/Oprire
./manage.sh start
./manage.sh stop
./manage.sh restart

# Vezi logs
./manage.sh logs backend
./manage.sh logs nginx

# Update aplicație
./manage.sh update

# Backup
./manage.sh backup

# Setup model AI
./manage.sh setup-ollama
```

## 🔒 Configurare SSL (HTTPS)

### Automată cu Let's Encrypt:
```bash
./setup-ssl.sh yourdomain.com admin@yourdomain.com
```

### Manuală:
```bash
# Instalare Certbot
sudo apt install certbot python3-certbot-nginx

# Generare certificat
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (crontab)
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 🌐 Configurare Firewall

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# FirewallD (CentOS)
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## 📊 Monitoring și Logs

### Vezi logs în timp real:
```bash
# Backend logs
docker logs -f avanchat_backend

# Database logs  
docker logs -f avanchat_postgres

# Nginx logs
docker logs -f avanchat_nginx

# Toate serviciile
./manage.sh logs
```

### Verificare resurse:
```bash
# Status containere
docker ps

# Utilizare resurse
docker stats

# Spațiu disk
df -h
du -sh /opt/avanchat/*
```

## 💾 Backup și Restore

### Backup automat:
```bash
# Backup manual
./backup.sh

# Backup programat (crontab)
echo "0 2 * * * /opt/avanchat/backup.sh" | crontab -
```

### Restore din backup:
```bash
# Oprire aplicație
./manage.sh stop

# Restore database
docker exec -i avanchat_postgres psql -U postgres < backup_db.sql

# Restore uploads
cp -r backup_uploads/* uploads/

# Pornire aplicație
./manage.sh start
```

## 🔧 Troubleshooting

### Probleme comune:

1. **Aplicația nu pornește:**
   ```bash
   # Verificare logs
   ./manage.sh logs
   
   # Verificare porturi
   sudo netstat -tlnp | grep -E '80|443|8000'
   
   # Restart complet
   ./manage.sh stop
   docker system prune -f
   ./manage.sh start
   ```

2. **Model AI nu funcționează:**
   ```bash
   # Reinstalare model
   docker exec avanchat_ollama ollama rm gemma2:2b
   docker exec avanchat_ollama ollama pull gemma2:2b
   ```

3. **SSL nu funcționează:**
   ```bash
   # Verificare certificat
   sudo certbot certificates
   
   # Renewal manual
   sudo certbot renew --dry-run
   ```

4. **Database connection error:**
   ```bash
   # Reset database
   docker-compose -f docker-compose.prod.yml down
   docker volume rm avanchat_postgres_data
   ./manage.sh start
   ```

## 🎯 Testare Deployment

1. **Health check:**
   ```bash
   curl http://your-server-ip/health
   curl https://yourdomain.com/api/v1/chat/municipalities
   ```

2. **Widget test:**
   - Accesează `http://your-server-ip/widget/demo.html`
   - Testează chat-ul cu întrebări despre TVA

3. **Performance test:**
   ```bash
   # Timp răspuns
   curl -w "@curl-format.txt" -s -o /dev/null http://your-server-ip/health
   ```

## 📈 Optimizare Performance

### Pentru servere cu resurse limitate:

1. **Reduce memory usage:**
   ```yaml
   # În docker-compose.prod.yml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 1G
             cpus: '0.5'
   ```

2. **Enable swap:**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## 🔄 Update și Maintenance

### Update aplicație:
```bash
# Method 1: Cu scriptul
./manage.sh update

# Method 2: Manual
git pull origin main
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Curățare sistem:
```bash
# Curățare Docker
docker system prune -a -f

# Curățare logs vechi
sudo find logs/ -name "*.log" -mtime +7 -delete

# Curățare backup-uri vechi  
find /backup -name "*.tar.gz" -mtime +30 -delete
```

---

## 📞 Support

Pentru probleme sau întrebări:
- GitHub Issues: https://github.com/Zgondea/AvanChat/issues
- Email: support@chatlegislativ.ro

**Aplicația ta va fi disponibilă la:**
- HTTP: `http://your-server-ip`
- HTTPS: `https://yourdomain.com` (după configurare SSL)
- Widget: `http://your-server-ip/widget/demo.html`