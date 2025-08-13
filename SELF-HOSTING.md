# 🏠 Self-Hosting pe Calculatorul Personal - AvanChat

Ghid pentru deploy **100% GRATUIT** pe calculatorul tău personal (Windows, macOS, Linux).

## 🎯 De ce Self-Hosting?

- ✅ **0 COSTURI** - doar calculatorul tău
- ✅ **Date private** - totul rămâne local
- ✅ **Control total** - nu depinzi de nimeni
- ✅ **Acces LAN** - toată familia poate folosi
- ✅ **Testare perfectă** - pentru dezvoltare

## 📋 Cerințe Minime

- **RAM**: 8GB (Windows/macOS), 4GB (Linux)  
- **Storage**: 10GB liberi
- **Internet**: Conexiune stabilă
- **OS**: Windows 10+, macOS 10.14+, Ubuntu 18.04+

## 🖥️ Windows (Opțiunea 1)

### Pas 1: Instalare Docker Desktop
```bash
# Download de la: https://www.docker.com/products/docker-desktop/
# Instalează și pornește Docker Desktop
```

### Pas 2: Setup aplicație
```bash
# Deschide PowerShell ca Administrator
cd C:\
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat

# Creare .env pentru Windows
copy .env.example .env
notepad .env  # editează parolele
```

### Pas 3: Pornire aplicație
```bash
# În PowerShell
docker-compose -f docker-compose.prod.yml up -d

# Verificare
docker ps
```

### Pas 4: Setup model AI
```bash
# Așteaptă 2-3 minute ca serviciile să pornească
docker exec avanchat_ollama ollama pull gemma2:2b
```

**Aplicația va fi disponibilă la:**
- Frontend: http://localhost
- API: http://localhost:8000  
- Widget: http://localhost/widget/demo.html

## 🍎 macOS (Opțiunea 2)

### Pas 1: Instalare dependențe
```bash
# Instalare Docker Desktop pentru Mac
# Download: https://www.docker.com/products/docker-desktop/

# Sau prin Homebrew
brew install --cask docker
```

### Pas 2: Setup aplicație  
```bash
# În Terminal
cd ~/Desktop
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat

# Configurare
cp .env.example .env
nano .env  # editează cu parolele tale
```

### Pas 3: Pornire
```bash
# Pornire aplicație
docker-compose -f docker-compose.prod.yml up -d

# Instalare model AI
sleep 120  # Așteaptă 2 minute
docker exec avanchat_ollama ollama pull gemma2:2b
```

## 🐧 Linux (Ubuntu/Debian) - Opțiunea 3

### Pas 1: Instalare Docker
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Instalare Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Instalare Docker Compose
sudo apt install docker-compose
```

### Pas 2: Setup aplicație
```bash
cd ~/
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat

# Configurare .env
cp .env.example .env
nano .env
```

Editează `.env`:
```env
POSTGRES_PASSWORD=local_secure_123
REDIS_PASSWORD=redis_local_123  
SECRET_KEY=my_super_secret_local_key
ENVIRONMENT=development
DEBUG=true
```

### Pas 3: Pornire
```bash
# Pornire aplicație
docker-compose -f docker-compose.prod.yml up -d

# Verificare status
docker-compose ps

# Setup model AI (poate dura 5-10 minute)
docker exec avanchat_ollama ollama pull gemma2:2b
```

## 🌐 Acces din Rețea (Opțional)

Pentru ca alții din casă să acceseze aplicația:

### Găsește IP-ul calculatorului:
```bash
# Windows
ipconfig

# macOS/Linux  
ifconfig
# sau
ip addr show
```

### Configurare firewall:

**Windows:**
- Control Panel → System and Security → Windows Defender Firewall
- Advanced Settings → Inbound Rules → New Rule
- Port → TCP → Specific Ports: 80, 443

**macOS:**
```bash
# Dezactivează firewall temporar pentru test
sudo pfctl -d
```

**Linux:**
```bash
# UFW
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

Acum aplicația va fi disponibilă la:
- `http://192.168.1.XXX` (IP-ul calculatorului tău)

## 🔧 Comenzi Utile pentru Self-Hosting

```bash
# Status aplicație
docker-compose ps

# Vezi logs în timp real
docker-compose logs -f backend

# Restart serviciu
docker-compose restart backend

# Oprire completă  
docker-compose down

# Pornire din nou
docker-compose -f docker-compose.prod.yml up -d

# Curățare (dacă vrei să resetezi totul)
docker-compose down -v
docker system prune -a -f
```

## 📊 Monitorizare Resurse

```bash
# Utilizare resurse containere
docker stats

# Spațiu folosit
docker system df

# Logs aplicație
docker logs avanchat_backend
docker logs avanchat_postgres
```

## 🔄 Auto-Start la Boot

### Windows (Task Scheduler):
1. Deschide Task Scheduler
2. Create Basic Task → "Start AvanChat"  
3. Trigger: At startup
4. Action: Start program → `docker-compose`
5. Arguments: `-f C:\AvanChat\docker-compose.prod.yml up -d`

### macOS (LaunchDaemon):
```bash
# Creare fișier startup
sudo nano /Library/LaunchDaemons/com.avanchat.startup.plist
```

### Linux (systemd):
```bash
# Creare service
sudo nano /etc/systemd/system/avanchat.service

[Unit]
Description=AvanChat Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/username/AvanChat
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker-compose down

[Install]
WantedBy=multi-user.target

# Activare
sudo systemctl enable avanchat.service
```

## 🎯 Testare Aplicație

1. **Health check:**
   ```bash
   curl http://localhost/health
   curl http://localhost:8000/api/v1/chat/municipalities
   ```

2. **Test widget:**
   - Accesează http://localhost/widget/demo.html
   - Întreabă: "Care este cota standard de TVA?"

3. **Test frontend:**
   - Accesează http://localhost
   - Login: admin@chatlegislativ.ro / admin123

## ⚡ Optimizare Performance

### Pentru calculatoare mai slabe:
```yaml
# În docker-compose.prod.yml - adaugă limits:
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
  ollama:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
```

### Reducere utilizare disk:
```bash
# Curățare periodică
docker system prune -f
docker volume prune -f
docker image prune -a -f
```

## 🔧 Troubleshooting

### Probleme comune:

1. **Port-ul 80 este ocupat:**
   ```bash
   # Windows - găsește ce folosește portul
   netstat -ano | findstr :80
   
   # Schimbă portul în docker-compose.prod.yml
   nginx:
     ports:
       - "8080:80"  # Acum va fi http://localhost:8080
   ```

2. **Docker nu pornește:**
   - Windows: Restart Docker Desktop
   - macOS: Deschide Docker Desktop din Applications
   - Linux: `sudo systemctl start docker`

3. **Model AI nu se descarcă:**
   ```bash
   # Verificare conexiune Ollama
   curl http://localhost:11434/api/tags
   
   # Reinstalare model
   docker exec -it avanchat_ollama bash
   ollama pull gemma2:2b
   ```

## 💡 Sfaturi Utile

- **Backup local**: Folderele `uploads/` și `logs/` conțin datele importante
- **Development**: Setează `DEBUG=true` în .env pentru mai multe logs
- **Performance**: Închide browserele și aplicațiile grele când rulezi aplicația
- **Security**: Pentru acces extern, folosește VPN sau configurează autentificare

---

## 🎉 Final

Acum ai aplicația **100% GRATIS** pe calculatorul tău! 

**Aplicația este disponibilă la:**
- 🖥️ Local: http://localhost  
- 🌐 Rețea: http://[IP-ul-tău]
- 🤖 Widget: http://localhost/widget/demo.html

Pentru oprire completă: `docker-compose down`
Pentru pornire: `docker-compose -f docker-compose.prod.yml up -d`