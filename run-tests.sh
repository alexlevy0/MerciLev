#!/bin/bash

echo "🚀 Lancement des tests de correction française"
echo ""

# Vérifier si Ollama est en cours d'exécution
if ! curl -s http://localhost:11434/ > /dev/null; then
    echo "❌ Ollama n'est pas démarré !"
    echo "   Lancez-le avec : OLLAMA_ORIGINS='*' ollama serve"
    exit 1
fi

# Exécuter les tests
echo "🧪 Exécution des tests..."
echo ""
node test-ollama.ts

