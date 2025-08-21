#!/bin/bash

echo "🧪 Test des cas problématiques"
echo ""

# Vérifier si Ollama est en cours d'exécution
if ! curl -s http://localhost:11434/ > /dev/null; then
    echo "❌ Ollama n'est pas démarré !"
    echo "   Lancez-le avec : OLLAMA_ORIGINS='*' ollama serve"
    exit 1
fi

# Exécuter le test directement avec tsx
npx tsx test-problematic.ts