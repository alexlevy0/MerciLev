# Modèle Granite-Embedding:278m

## 🚀 Nouveau modèle ajouté

### Caractéristiques
- **Nom** : `granite-embedding:278m`
- **Taille** : 278 millions de paramètres (ultra-léger)
- **Option spéciale** : `num_ctx: 512` (contexte limité pour performance optimale)
- **Usage** : Idéal pour corrections rapides sur machines moins puissantes

## 📋 Configuration

### Options spécifiques
```javascript
{
  num_ctx: 512  // Limite le contexte à 512 tokens
}
```

Cette configuration est automatiquement appliquée lors de l'utilisation du modèle.

## 🔧 Installation

1. **Télécharger le modèle** :
   ```bash
   ollama pull granite-embedding:278m
   ```

2. **Vérifier l'installation** :
   ```bash
   ollama list
   ```

## 🧪 Tests

### Test individuel
```bash
# Tester uniquement granite-embedding
npm run test:granite
```

### Comparaison avec les autres modèles
```bash
# Comparer tous les modèles
npm run test:compare
```

## 💡 Utilisation dans l'extension

1. **Ouvrir le popup** de l'extension
2. **Sélectionner** "granite-embedding:278m (Ultra-léger)"
3. **Tester** la connexion
4. **Utiliser** normalement

## 📊 Comparaison attendue

| Aspect | Gemma3n:e4b | Gemma3n:e2b | Granite-Embedding |
|--------|-------------|-------------|-------------------|
| Taille | ~4GB | ~2GB | ~150MB |
| Vitesse | Moyenne | Rapide | Ultra-rapide |
| Précision | Excellente | Excellente | À tester |
| RAM requise | ~8GB | ~4GB | ~2GB |
| Contexte | Illimité | Illimité | 512 tokens |

## ⚡ Avantages

1. **Performance** : Devrait être 2-3x plus rapide
2. **Légèreté** : Utilise très peu de ressources
3. **Réactivité** : Idéal pour autocomplétion temps réel
4. **Compatibilité** : Fonctionne sur machines modestes

## ⚠️ Limitations

1. **Contexte limité** : 512 tokens maximum
2. **Précision** : Peut être inférieure sur phrases complexes
3. **Vocabulaire** : Possiblement plus limité

## 🎯 Cas d'usage recommandés

### ✅ Idéal pour :
- Corrections rapides en temps réel
- Machines avec peu de RAM
- Autocomplétion instantanée
- Corrections simples (orthographe, accords basiques)

### ❌ Moins adapté pour :
- Textes très longs
- Corrections grammaticales complexes
- Reformulations complètes
- Contexte nécessitant plus de 512 tokens

## 🔄 Switching entre modèles

L'extension permet de changer de modèle à la volée :
- **Travail simple** → Granite-Embedding
- **Travail complexe** → Gemma3n:e2b
- **Maximum de précision** → Gemma3n:e4b

Le changement est instantané via le popup ! 🎉