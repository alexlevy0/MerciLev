#!/bin/bash

echo "🚀 Lancement des tests de correction française"
echo ""

# Vérifier si Ollama est en cours d'exécution
if ! curl -s http://localhost:11434/ > /dev/null; then
    echo "❌ Ollama n'est pas démarré !"
    echo "   Lancez-le avec : OLLAMA_ORIGINS='*' ollama serve"
    exit 1
fi

# Compiler le test et ses dépendances
echo "🧪 Compilation des tests..."
npx esbuild test-ollama.ts --bundle --platform=node --outfile=test-ollama.js --format=cjs

# Exécuter les tests
echo ""
echo "🧪 Exécution des tests..."
echo ""
node test-ollama.js

# Nettoyer
rm -f test-ollama.js

