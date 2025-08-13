#!/bin/bash

echo "🚀 Chat Legislativ - Deploy Script"
echo "=================================="

# Verifică dacă este în directorul corect
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Te rog să rulezi scriptul din directorul proiectului (unde este docker-compose.yml)"
    exit 1
fi

# Verifică dacă git este inițializat
if [ ! -d ".git" ]; then
    echo "📦 Inițializez git repository..."
    git init
    git add .
    git commit -m "🚀 Initial commit - Chat Legislativ cu RAG system avansat"
fi

echo ""
echo "📋 PAȘII PENTRU DEPLOY:"
echo ""
echo "1. 📁 Creează repository pe GitHub:"
echo "   - Deschide: https://github.com/new"
echo "   - Repository name: chat-legislativ"
echo "   - Public ✅"
echo "   - NU adăuga README/gitignore ❌"
echo "   - Click 'Create repository'"
echo ""

echo "2. 📤 Copiază și rulează (înlocuiește YOUR_USERNAME):"
echo "   git remote add origin https://github.com/YOUR_USERNAME/chat-legislativ.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""

echo "3. ☁️  Deploy pe Railway:"
echo "   - Deschide: https://railway.app"
echo "   - Sign up cu GitHub"
echo "   - New Project → Deploy from GitHub repo"
echo "   - Selectează: chat-legislativ"
echo "   - Deploy! (3-5 minute)"
echo ""

echo "4. ⚙️  Environment Variables în Railway:"
echo "   - Variables tab"
echo "   - SECRET_KEY: your-production-secret-here"
echo "   - ENVIRONMENT: production"
echo ""

echo "5. 🎉 Gata! Aplicația va fi live la:"
echo "   https://chat-legislativ-production.up.railway.app"
echo ""

read -p "Apasă ENTER pentru a deschide GitHub..."
open "https://github.com/new"

read -p "După ce creezi repo-ul, apasă ENTER pentru Railway..."
open "https://railway.app"

echo ""
echo "✅ Repository local pregătit pentru deploy!"
echo "📂 Fișiere: $(git ls-files | wc -l | tr -d ' ') files ready"
echo "💾 Commit: $(git log --oneline -1)"
echo ""
echo "🔥 Următorul pas: Creează repo pe GitHub și fă push!"