# Extension Chrome - Correcteur Français

## Prérequis

- Node.js et npm installés
- Ollama installé avec le modèle `gemma3n:e4b`

## Build

```bash
# Installation des dépendances (première fois seulement)
npm install

# Compilation de l'extension
./build.sh

# Ou directement avec esbuild
npx esbuild background.ts content.ts popup.ts --bundle --outdir=. --format=iife
```

## Tests

```bash
# Lancer les tests de correction
./run-tests.sh
```

## Installation

1. **Installer le modèle Ollama** : `ollama pull gemma3n:e4b`
2. **Démarrer Ollama avec les origines autorisées** :
   ```bash
   OLLAMA_ORIGINS="*" ollama serve
   ```
   OU sur Windows :
   ```cmd
   set OLLAMA_ORIGINS=*
   ollama serve
   ```
3. **Charger l'extension** : Chrome → Extensions → Mode développeur → Charger l'extension non empaquetée → Sélectionner ce dossier

## Résolution des problèmes

### Erreur 403 (Accès refusé)
Si vous obtenez une erreur 403, c'est que Ollama bloque les requêtes de l'extension. Assurez-vous de démarrer Ollama avec `OLLAMA_ORIGINS="*"` comme indiqué ci-dessus.

### Alternative plus sécurisée
Au lieu d'autoriser toutes les origines avec `*`, vous pouvez spécifier uniquement l'origine de l'extension Chrome :
```bash
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

## Utilisation

L'extension corrige automatiquement les mots en français quand vous tapez un espace après un mot dans n'importe quel champ de texte. Les mots corrigés sont soulignés en vert.