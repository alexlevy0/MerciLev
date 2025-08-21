#!/bin/bash

echo "🏗️  Construction de l'extension Chrome..."
echo ""

# Nettoyer les anciens fichiers
echo "🧹 Nettoyage des anciens fichiers..."
rm -f *.js

# Compiler avec esbuild
echo "📦 Compilation des fichiers TypeScript..."
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