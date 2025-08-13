#!/bin/bash

# Script de instalare AvanChat pe VM Ubuntu/CentOS
# Usage: curl -fsSL https://raw.githubusercontent.com/username/avanchat/main/vm-install.sh | bash

set -e

# Colors pentru output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Detectare OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        error "Nu se poate detecta sistemul de operare"
    fi
    
    log "OS detectat: $OS $VER"
}

# Update sistem
update_system() {
    log "Se actualizează sistemul..."
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt-get update && apt-get upgrade -y
        apt-get install -y curl wget git unzip
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        yum update -y
        yum install -y curl wget git unzip
    else
        warning "OS necunoscut, continuând cu pachetele disponibile"
    fi
}

# Instalare Docker
install_docker() {
    log "Se instalează Docker..."
    
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com | sh
        systemctl start docker
        systemctl enable docker
        usermod -aG docker $USER
        log "Docker instalat cu succes"
    else
        log "Docker este deja instalat"
    fi
}

# Instalare Docker Compose
install_docker_compose() {
    log "Se instalează Docker Compose..."
    
    if ! command -v docker-compose &> /dev/null; then
        # Instalare prin pip pentru compatibilitate maximă
        if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
            apt-get install -y python3-pip
        elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
            yum install -y python3-pip
        fi
        
        pip3 install docker-compose
        log "Docker Compose instalat cu succes"
    else
        log "Docker Compose este deja instalat"
    fi
}

# Creare director și setup aplicație
setup_application() {
    log "Se configurează aplicația..."
    
    # Creare director
    APP_DIR="/opt/avanchat"
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Clonare repository
    if [[ -d ".git" ]]; then
        log "Repository-ul există, se face pull..."
        git pull origin main
    else
        log "Se clonează repository-ul..."
        git clone https://github.com/Zgondea/AvanChat.git .
    fi
    
    # Creare directoare necesare
    mkdir -p uploads logs ssl nginx/ssl
    
    # Setare permisiuni
    chown -R $USER:$USER $APP_DIR
    chmod -R 755 $APP_DIR
}

# Configurare environment variables
setup_environment() {
    log "Se configurează environment variables..."
    
    cat > .env << EOF
# Database Configuration
POSTGRES_PASSWORD=secure_db_password_$(date +%s)
REDIS_PASSWORD=secure_redis_password_$(date +%s)

# Application Configuration
SECRET_KEY=production_secret_key_$(openssl rand -hex 32)
ENVIRONMENT=production
DEBUG=false

# Domain Configuration (schimbă cu domeniul tău)
DOMAIN=localhost
SSL_EMAIL=admin@yourdomain.com

# Backup Configuration
BACKUP_RETENTION_DAYS=7
EOF
    
    chmod 600 .env
    log "Environment variables configurate în .env"
}

# Configurare Nginx pentru producție
setup_nginx() {
    log "Se configurează Nginx..."
    
    mkdir -p nginx
    
    cat > nginx/nginx.prod.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=widget:10m rate=30r/s;

    # Backend upstream
    upstream backend {
        server backend:8000;
        keepalive 32;
    }

    # Frontend upstream
    upstream frontend {
        server frontend:3000;
        keepalive 32;
    }

    server {
        listen 80;
        server_name _;

        # Redirect HTTP to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # API Backend
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Chat Widget
        location /widget/ {
            limit_req zone=widget burst=50 nodelay;
            
            alias /usr/share/nginx/html/widget/;
            expires 1h;
            add_header Cache-Control "public, immutable";
            
            location ~* \.(js|css)$ {
                expires 7d;
                add_header Cache-Control "public, immutable";
            }
        }

        # Frontend React App
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            
            # Fallback pentru React Router
            try_files $uri $uri/ @frontend;
        }
        
        location @frontend {
            proxy_pass http://frontend;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Security
        location ~ /\.ht {
            deny all;
        }
        
        location ~ /\.git {
            deny all;
        }
    }
}
EOF
    
    log "Nginx configurat pentru producție"
}

# Creare script SSL cu Let's Encrypt
setup_ssl_script() {
    log "Se creează script pentru SSL..."
    
    cat > setup-ssl.sh << 'EOF'
#!/bin/bash

# Script pentru configurare SSL cu Let's Encrypt
# Usage: ./setup-ssl.sh yourdomain.com admin@yourdomain.com

DOMAIN=$1
EMAIL=$2

if [[ -z "$DOMAIN" ]] || [[ -z "$EMAIL" ]]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 avanchat.ro admin@avanchat.ro"
    exit 1
fi

# Instalare Certbot
if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
elif command -v yum &> /dev/null; then
    yum install -y epel-release
    yum install -y certbot python3-certbot-nginx
fi

# Generare certificat
certbot --nginx -d $DOMAIN -m $EMAIL --agree-tos --non-interactive --redirect

# Auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo "SSL configurat pentru $DOMAIN"
EOF
    
    chmod +x setup-ssl.sh
    log "Script SSL creat: setup-ssl.sh"
}

# Creare script de backup
setup_backup_script() {
    log "Se creează script pentru backup..."
    
    cat > backup.sh << 'EOF'
#!/bin/bash

# Script backup pentru AvanChat
BACKUP_DIR="/backup/avanchat"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="avanchat_backup_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Backup database
docker exec avanchat_postgres pg_dumpall -U postgres > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
cp -r uploads $BACKUP_DIR/uploads_$DATE

# Backup logs
cp -r logs $BACKUP_DIR/logs_$DATE

# Creare arhivă
tar -czf $BACKUP_DIR/$BACKUP_FILE -C $BACKUP_DIR db_$DATE.sql uploads_$DATE logs_$DATE

# Curățare fișiere temporare
rm -rf $BACKUP_DIR/db_$DATE.sql $BACKUP_DIR/uploads_$DATE $BACKUP_DIR/logs_$DATE

# Păstrare doar ultimele 7 backup-uri
find $BACKUP_DIR -name "avanchat_backup_*.tar.gz" -mtime +7 -delete

echo "Backup creat: $BACKUP_DIR/$BACKUP_FILE"
EOF
    
    chmod +x backup.sh
    log "Script backup creat: backup.sh"
}

# Creare script de management
setup_management_script() {
    log "Se creează script de management..."
    
    cat > manage.sh << 'EOF'
#!/bin/bash

# Script de management AvanChat
ACTION=$1

case $ACTION in
    start)
        echo "Pornire AvanChat..."
        docker-compose -f docker-compose.prod.yml up -d
        ;;
    stop)
        echo "Oprire AvanChat..."
        docker-compose -f docker-compose.prod.yml down
        ;;
    restart)
        echo "Restart AvanChat..."
        docker-compose -f docker-compose.prod.yml restart
        ;;
    status)
        echo "Status AvanChat..."
        docker-compose -f docker-compose.prod.yml ps
        ;;
    logs)
        SERVICE=${2:-backend}
        echo "Logs pentru $SERVICE..."
        docker-compose -f docker-compose.prod.yml logs -f $SERVICE
        ;;
    update)
        echo "Update AvanChat..."
        git pull origin main
        docker-compose -f docker-compose.prod.yml build
        docker-compose -f docker-compose.prod.yml up -d
        ;;
    backup)
        echo "Backup AvanChat..."
        ./backup.sh
        ;;
    setup-ollama)
        echo "Setup Ollama model..."
        docker exec avanchat_ollama ollama pull gemma2:2b
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|update|backup|setup-ollama}"
        echo ""
        echo "Commands:"
        echo "  start       - Pornește aplicația"
        echo "  stop        - Oprește aplicația"
        echo "  restart     - Restart aplicația"
        echo "  status      - Afișează status containerele"
        echo "  logs        - Afișează logs (opțional: service name)"
        echo "  update      - Update aplicația din git"
        echo "  backup      - Creează backup"
        echo "  setup-ollama - Instalează modelul AI"
        ;;
esac
EOF
    
    chmod +x manage.sh
    log "Script management creat: manage.sh"
}

# Instalare inițială Ollama model
setup_ollama_model() {
    log "Se pregătește modelul Ollama..."
    
    cat > setup-ollama-model.sh << 'EOF'
#!/bin/bash

echo "Așteptare pornire Ollama..."
sleep 30

echo "Instalare model Gemma2:2b..."
docker exec avanchat_ollama ollama pull gemma2:2b

echo "Model Ollama instalat cu succes!"
EOF
    
    chmod +x setup-ollama-model.sh
}

# Funcție principală
main() {
    log "=== Instalare AvanChat pe VM ==="
    
    # Verificare root
    if [[ $EUID -ne 0 ]]; then
        error "Acest script trebuie rulat ca root"
    fi
    
    detect_os
    update_system
    install_docker
    install_docker_compose
    setup_application
    setup_environment
    setup_nginx
    setup_ssl_script
    setup_backup_script
    setup_management_script
    setup_ollama_model
    
    log "=== Instalare completă ==="
    info ""
    info "Următorii pași:"
    info "1. Editează .env cu configurațiile tale"
    info "2. Pentru SSL: ./setup-ssl.sh yourdomain.com admin@yourdomain.com"
    info "3. Pornește aplicația: ./manage.sh start"
    info "4. Instalează modelul AI: ./manage.sh setup-ollama"
    info ""
    info "Comenzi utile:"
    info "  ./manage.sh status   - Status aplicație"
    info "  ./manage.sh logs     - Vezi logs"
    info "  ./manage.sh backup   - Creează backup"
    info ""
    info "Aplicația va fi disponibilă pe:"
    info "  HTTP:  http://your-server-ip"
    info "  HTTPS: https://your-domain.com (după SSL)"
}

# Rulare script
main "$@"
EOF

chmod +x vm-install.sh