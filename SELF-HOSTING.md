# 🏠 AvanChat - Setup Automat pe Calculatorul Tău

## 🎉 **Deploy în 30 secunde - 100% GRATUIT & AUTOMAT**

### 🚀 **Un singur command pentru toate sistemele:**

```bash
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat  
docker-compose up --build

# Gata! 🎯
# ✅ Toate serviciile pornesc automat
# ✅ Baza de date se creează singură
# ✅ Admin user: admin@chatlegislativ.ro / admin123
# ✅ Zero configurare necesară!
```

## 🎯 **De ce Self-Hosting Automat?**

- 🚀 **Setup în 30 secunde** - fără configurare manuală
- ✅ **0 COSTURI** - doar calculatorul tău
- ✅ **Date 100% private** - totul rămâne local  
- ✅ **Control total** - modifici codul cum vrei
- ✅ **Acces din toată casa** - prin IP local
- ✅ **Perfect pentru testare** - development instant

## 📋 **Cerințe (Minime)**

- **RAM**: 4GB+ (8GB recomandat)
- **Storage**: 5GB liberi
- **OS**: Windows 10+, macOS 10.14+, Ubuntu 18.04+
- **Docker**: Se instalează automat pe majoritatea sistemelor

## 🖥️ **Windows - Setup Automat Complet**

### 🎯 **One-Step Setup (Recomandat)**
```powershell
# 1. Instalează Docker Desktop (dacă nu îl ai)
# Download: https://www.docker.com/products/docker-desktop/

# 2. Deschide PowerShell și rulează:
cd C:\
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat
docker-compose up --build

# Gata! 🎉 Tot ce ai nevoie este gata automat:
# ✅ PostgreSQL + toate tabelele
# ✅ Admin user creat (admin@chatlegislativ.ro / admin123)  
# ✅ Frontend la http://localhost
# ✅ API la http://localhost:8000
# ✅ Widget demo la http://localhost/municipality-demo
```

### 🤖 **Instalare Model AI (Opțional)**
```powershell
# Pentru răspunsuri AI mai bune (după ce aplicația pornește)
docker exec chat_legislativ_ollama ollama pull gemma2:2b
```

## 🍎 **macOS - Setup Automat Complet**

### 🚀 **One-Command Setup**
```bash
# 1. Instalează Docker (dacă nu îl ai)
brew install --cask docker
# Sau download: https://www.docker.com/products/docker-desktop/

# 2. În Terminal:
cd ~/Desktop
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat  
docker-compose up --build

# Rezultat automat:
# ✅ Toate serviciile pornesc singure
# ✅ Baza de date creată cu tot cu tabele
# ✅ Admin user: admin@chatlegislativ.ro / admin123
# ✅ Zero configurare manuală!
```

### 🤖 **Model AI (Opțional)**
```bash
# Pentru performanță AI mai bună
docker exec chat_legislativ_ollama ollama pull gemma2:2b
```

## 🐧 **Linux (Ubuntu/Debian) - Setup Automat**

### 🚀 **Script Automat Complet**
```bash
# Instalare Docker + setup complet automat
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install docker-compose -y

# Logout/login sau:
newgrp docker

# Setup aplicație (automat complet)
git clone https://github.com/Zgondea/AvanChat.git
cd AvanChat
docker-compose up --build

# Rezultat:
# ✅ Docker instalat
# ✅ Toate serviciile pornite
# ✅ Baza de date cu tabele create
# ✅ Admin user creat automat
# ✅ Aplicația funcțională la http://localhost
```

### 🎯 **One-Liner pentru Experts**
```bash
# Totul într-o comandă (pentru cei aventuroși)
curl -fsSL https://get.docker.com | sh && \
sudo usermod -aG docker $USER && \
sudo apt install docker-compose -y && \
newgrp docker && \
git clone https://github.com/Zgondea/AvanChat.git && \
cd AvanChat && \
docker-compose up --build
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