# Modèle Qwen 2.5 3B

## 🚀 Nouveau modèle ajouté : qwen2.5:3b

Un nouveau modèle a été ajouté à l'extension pour offrir plus de choix et potentiellement de meilleures performances.

## 📊 Caractéristiques

### Spécifications
- **Nom complet** : Qwen 2.5 3B
- **Taille** : 3 milliards de paramètres
- **Développeur** : Alibaba Cloud
- **Architecture** : Basée sur les dernières avancées en LLM

### Avantages attendus
- 🚀 **Performance** : Optimisé pour les tâches linguistiques
- 🌍 **Multilingue** : Support amélioré du français
- ⚡ **Efficacité** : Équilibre entre taille et capacités
- 🎯 **Précision** : Entraîné sur des données multilingues de qualité

## 🔧 Installation

### 1. Télécharger le modèle
```bash
ollama pull qwen2.5:3b
```

### 2. Vérifier l'installation
```bash
ollama list
```

### 3. Tester le modèle
```bash
ollama run qwen2.5:3b "Corrige cette phrase : Je suis allez au marcher"
```

## 🧪 Tests

### Commande de test spécifique
```bash
npm run test:qwen
```

### Comparaison avec tous les modèles
```bash
npm run test:compare
```

Le modèle `qwen2.5:3b` sera testé **en premier** dans la comparaison.

## 📈 Utilisation dans l'extension

### Via le popup
1. Cliquer sur l'icône de l'extension
2. Sélectionner "qwen2.5:3b (Nouveau)" dans le menu déroulant
3. Le changement est immédiat

### Via l'API
```typescript
chrome.runtime.sendMessage({ 
  type: 'change-model', 
  model: 'qwen2.5:3b' 
});
```

## 🎯 Cas d'usage recommandés

### Idéal pour
- ✅ Corrections grammaticales complexes
- ✅ Détection d'erreurs subtiles
- ✅ Contexte multilingue
- ✅ Phrases longues et complexes

### À tester contre
- `gemma3n:e2b` : Pour la vitesse
- `gemma3n:e4b` : Pour la précision
- `granite-embedding:278m` : Pour la légèreté

## 📊 Performances attendues

| Critère | Estimation |
|---------|------------|
| **Vitesse** | ~5-8s par requête |
| **Précision** | À déterminer |
| **Consommation RAM** | ~2-3 GB |
| **Taille sur disque** | ~2 GB |

## 🔍 Points d'attention

1. **Taille** : Plus lourd que granite-embedding mais plus léger que gemma
2. **Prompt** : Peut nécessiter des ajustements du prompt
3. **Performance** : À évaluer selon votre configuration

## 🚦 Prochaines étapes

1. Installer le modèle avec `ollama pull qwen2.5:3b`
2. Lancer les tests avec `npm run test:qwen`
3. Comparer avec `npm run test:compare`
4. Ajuster le prompt si nécessaire

Le modèle est maintenant **disponible** dans l'extension et prêt à être testé ! 🎉