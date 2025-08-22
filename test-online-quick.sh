#!/bin/bash

# Test rapide d'Ollama en ligne avec ngrok
echo "🚀 Test rapide d'Ollama en ligne avec ngrok"
echo "==========================================="

# 1. Vérifier si Ollama est installé
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama n'est pas installé"
    echo "Installez-le d'abord : https://ollama.ai"
    exit 1
fi

# 2. Vérifier si ngrok est installé
if ! command -v ngrok &> /dev/null; then
    echo "📦 Installation de ngrok..."
    
    # Détecter l'OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install ngrok
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
        echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
        sudo apt update && sudo apt install ngrok
    else
        echo "❌ OS non supporté. Installez ngrok manuellement : https://ngrok.com/download"
        exit 1
    fi
fi

# 3. Lancer Ollama avec CORS activé
echo "🔧 Lancement d'Ollama avec CORS..."
export OLLAMA_ORIGINS="*"
ollama serve &
OLLAMA_PID=$!
echo "Ollama PID: $OLLAMA_PID"

# Attendre qu'Ollama soit prêt
sleep 3

# 4. Vérifier qu'Ollama fonctionne
echo "🧪 Test d'Ollama..."
if curl -s http://localhost:11434/api/version > /dev/null; then
    echo "✅ Ollama fonctionne localement"
else
    echo "❌ Ollama ne répond pas"
    kill $OLLAMA_PID
    exit 1
fi

# 5. Lancer ngrok
echo "🌐 Lancement de ngrok..."
ngrok http 11434 &
NGROK_PID=$!

# Attendre que ngrok démarre
sleep 5

# 6. Récupérer l'URL ngrok
echo "📡 Récupération de l'URL publique..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Impossible de récupérer l'URL ngrok"
    echo "Vérifiez manuellement sur : http://localhost:4040"
else
    echo ""
    echo "✅ Ollama est maintenant accessible en ligne !"
    echo "============================================"
    echo ""
    echo "🌐 URL publique : $NGROK_URL"
    echo ""
    echo "📝 Pour utiliser dans votre extension :"
    echo "1. Modifiez ollama-prompt.ts :"
    echo "   export const OLLAMA_ENDPOINT = '$NGROK_URL/api/generate';"
    echo ""
    echo "2. Recompilez l'extension :"
    echo "   npm run build"
    echo ""
    echo "🧪 Tester l'API :"
    echo "curl $NGROK_URL/api/version"
    echo ""
    echo "⚠️  Note : Cette URL changera à chaque redémarrage de ngrok"
    echo "Pour une solution permanente, utilisez deploy-quick.sh"
fi

echo ""
echo "🛑 Appuyez sur Ctrl+C pour arrêter"

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "🧹 Nettoyage..."
    kill $OLLAMA_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    echo "✅ Arrêt terminé"
    exit 0
}

# Capturer Ctrl+C
trap cleanup INT

# Attendre
wait