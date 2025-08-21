#!/bin/bash

echo "🏗️  Construction de l'extension Chrome..."
echo ""
echo "ℹ️  Note: Chrome nécessite du JavaScript, donc nous devons compiler le TypeScript"
echo ""

# Nettoyer les anciens fichiers JS de l'extension
echo "🧹 Nettoyage des anciens fichiers..."
rm -f background.js content.js popup.js

# Compiler avec esbuild (seulement les fichiers de l'extension)
echo "📦 Compilation des fichiers TypeScript de l'extension..."
npx esbuild background.ts content.ts popup.ts --bundle --outdir=. --format=iife

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Extension compilée avec succès !"
    echo ""
    echo "📁 Fichiers générés :"
    ls -lh *.js | awk '{print "   - " $9 " (" $5 ")"}'
    echo ""
    echo "🚀 Pour installer l'extension :"
    echo "   1. Ouvrez chrome://extensions/"
    echo "   2. Activez le mode développeur"
    echo "   3. Cliquez sur 'Charger l'extension non empaquetée'"
    echo "   4. Sélectionnez le dossier : $(pwd)"
else
    echo ""
    echo "❌ Erreur lors de la compilation !"
    exit 1
fi