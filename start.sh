#!/bin/bash

echo "🏛️  Chat Legislativ - Sistem AI pentru Primării"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker nu este pornit. Vă rog porniți Docker și încercați din nou."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose nu este instalat."
    exit 1
fi

echo "✅ Docker este disponibil"

# Create necessary directories
echo "📁 Creez directoarele necesare..."
mkdir -p backend/uploads
mkdir -p backend/logs
mkdir -p database/backups

# Set proper permissions
chmod 755 backend/uploads
chmod 755 backend/logs

echo "🔧 Pornesc serviciile..."

# Start the services
docker-compose up -d

# Wait for services to start
echo "⏳ Aștept ca serviciile să pornească..."
sleep 10

# Check if services are running
echo "🔍 Verific statusul serviciilor..."

# Check PostgreSQL
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL: Funcțional"
else
    echo "❌ PostgreSQL: Nu răspunde"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: Funcțional"
else
    echo "❌ Redis: Nu răspunde"
fi

# Check Backend
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend: Funcțional"
else
    echo "⏳ Backend: Se încarcă..."
fi

# Check Ollama (might take longer to start)
echo "🦙 Verific Ollama și modelul AI..."
sleep 5

if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    echo "✅ Ollama: Funcțional"
    
    # Check if model is available
    if docker-compose exec -T ollama ollama list | grep -q llama3.2:3b; then
        echo "✅ Model Llama 3.2 3B: Disponibil"
    else
        echo "⏳ Se descarcă modelul Llama 3.2 3B... (poate dura câteva minute)"
        docker-compose exec -T ollama ollama pull llama3.2:3b
        echo "✅ Model Llama 3.2 3B: Descărcat"
    fi
else
    echo "⏳ Ollama: Se încarcă..."
fi

echo ""
echo "🎉 Sistemul Chat Legislativ este gata!"
echo ""
echo "📱 Accesează aplicația:"
echo "   • Admin Panel: http://localhost"
echo "   • Login: admin@chatlegislativ.ro / admin123"
echo "   • API Docs: http://localhost/docs"
echo "   • Widget Demo: http://localhost/widget/demo.html"
echo ""
echo "🔧 Comenzi utile:"
echo "   • Vezi logs: docker-compose logs -f"
echo "   • Oprește: docker-compose down"
echo "   • Restart: docker-compose restart"
echo ""
echo "📚 Pentru mai multe informații, vezi README.md"