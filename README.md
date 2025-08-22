# Extension Chrome - Correcteur Français

## Prérequis

- Node.js 24+ et npm installés (pour le support TypeScript natif)
- Ollama installé avec l'un des modèles suivants :
  - `gemma3n:e2b` (par défaut, rapide et précis)
  - `gemma3n:e4b` (précision maximale)
  - `granite-embedding:278m` (ultra-léger, avec `num_ctx: 512`)

## Installation

```bash
# Installation des dépendances
npm install
```

## Build

```bash
# Compilation de l'extension Chrome (nécessaire car Chrome ne supporte pas TypeScript)
npm run build
```

## Tests

### Script de test unifié

Un seul script `test-all.ts` gère tous les tests avec les fonctionnalités suivantes :
- **Retry automatique** : 3 essais maximum par test
- **Comparaison de modèles** : Compare la précision et la vitesse
- **Tests spécifiques** : Teste un modèle particulier
- **Rapport détaillé** : Affiche les échecs et recommandations

```bash
# Test standard (modèle par défaut)
npm test
# ou
./test-all.ts

# Comparer tous les modèles
npm run test:compare
# ou
./test-all.ts --compare

# Tester un modèle spécifique
npm run test:e2b    # Test gemma3n:e2b
npm run test:e4b    # Test gemma3n:e4b
# ou
./test-all.ts --model=gemma3n:e2b

# Build + Tests
npm run dev

# Afficher l'aide
./test-all.ts --help
```

### Prompt optimisé

Le prompt a été amélioré avec :
- **Règles spécifiques** pour ce/se, Tout/Tous
- **Exemples critiques** pour chaque type d'erreur
- **Instructions claires** pour les phrases déjà correctes
- **Gestion des infinitifs** après prépositions

## Exécution directe des scripts

Tous les scripts sont écrits en TypeScript et peuvent être exécutés directement :

```bash
# Build
./build.ts

# Tests
./run-tests.ts

# Tests problématiques
./test-problematic-runner.ts
```

Note : Node.js 24+ utilise le flag `--experimental-strip-types` pour exécuter TypeScript directement, sans compilation préalable ni dépendance externe comme `tsx`.

## Installation de l'extension Chrome

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