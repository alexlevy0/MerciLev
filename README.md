# Extension Chrome - Correcteur Français

## Commande de build

```bash
bunx esbuild background.ts content.ts popup.ts --bundle --outdir=. --format=iife
```

## Installation

1. **Installer le modèle Ollama** : `ollama pull gemma3n:e4b`
2. **Démarrer Ollama** : `ollama serve`
3. **Charger l'extension** : Chrome → Extensions → Mode développeur → Charger l'extension non empaquetée → Sélectionner ce dossier

## Utilisation

L'extension corrige automatiquement les mots en français quand vous tapez un espace après un mot dans n'importe quel champ de texte. Les mots corrigés sont soulignés en vert.