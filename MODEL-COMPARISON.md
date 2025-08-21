# Comparaison des modèles Ollama

## 🚀 Nouveautés

L'extension supporte maintenant plusieurs modèles Ollama avec la possibilité de :
- Changer de modèle depuis le popup de l'extension
- Tester différents modèles
- Comparer leurs performances

## 📊 Modèles disponibles

### gemma3n:e4b (Recommandé)
- **Points forts** : Meilleure précision pour la correction française
- **Utilisation** : Idéal pour une correction complète et précise
- **Vitesse** : Moyenne (~300-500ms par requête)

### gemma3n:e2b
- **Points forts** : Plus rapide
- **Utilisation** : Pour une correction basique avec temps de réponse réduit
- **Vitesse** : Rapide (~200-400ms par requête)

## 🛠️ Utilisation

### Dans l'extension Chrome

1. Cliquez sur l'icône de l'extension
2. Utilisez le menu déroulant pour sélectionner le modèle
3. Le changement est immédiat

### Tests en ligne de commande

```bash
# Tester avec le modèle par défaut (e4b)
npm test

# Tester spécifiquement avec e4b
npm run test:e4b

# Tester avec e2b
npm run test:e2b

# Comparer tous les modèles
npm run test:compare
```

## 📈 Comparaison des modèles

Pour comparer les performances des modèles :

```bash
npm run test:compare
```

Ce script :
- Teste les deux modèles sur un ensemble de phrases
- Mesure la vitesse de réponse
- Calcule le taux de réussite
- Recommande le meilleur modèle selon vos besoins

### Exemple de sortie

```
🔬 Comparaison des modèles Ollama pour la correction française
════════════════════════════════════════════════════════════

🤖 Test du modèle: gemma3n:e4b
──────────────────────────────────────────────────────────
  📝 Homophones et majuscules... ✅ 342ms
  📝 Participe passé et accord... ✅ 285ms
  📝 C'est/Ces et accord pluriel... ❌ 412ms
  📝 Espaces manquants et accords... ✅ 356ms
  📝 Homophones multiples... ✅ 298ms

🤖 Test du modèle: gemma3n:e2b
──────────────────────────────────────────────────────────
  📝 Homophones et majuscules... ✅ 245ms
  📝 Participe passé et accord... ✅ 198ms
  📝 C'est/Ces et accord pluriel... ✅ 267ms
  📝 Espaces manquants et accords... ❌ 223ms
  📝 Homophones multiples... ✅ 189ms

🏆 COMPARAISON DES MODÈLES
════════════════════════════════════════════════════════════════════════════════

📈 Performance et Précision:

┌─────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Modèle              │ Score    │ Moy (ms) │ Min (ms) │ Max (ms) │ Total(s) │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ gemma3n:e4b         │ 4/5  80% │      339 │      285 │      412 │      1.7 │
│ gemma3n:e2b         │ 4/5  80% │      224 │      189 │      267 │      1.1 │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

🎯 Analyse:
   🥇 Meilleure précision: gemma3n:e4b (80%)
   ⚡ Plus rapide: gemma3n:e2b (224ms en moyenne)

💡 Recommandation:
   ➡️  gemma3n:e2b recommandé (vitesse avec précision similaire)
```

## 🔧 Configuration avancée

### Ajouter un nouveau modèle

1. Modifier `ollama-prompt.ts` :
```typescript
export const MODELS = {
  GEMMA3N_E4B: 'gemma3n:e4b',
  GEMMA3N_E2B: 'gemma3n:e2b',
  // Ajouter ici
  MON_MODELE: 'mon-modele:tag',
} as const;
```

2. Mettre à jour `popup.html` :
```html
<select id="modelSelect">
  <option value="gemma3n:e4b">gemma3n:e4b (Recommandé)</option>
  <option value="gemma3n:e2b">gemma3n:e2b (Plus rapide)</option>
  <option value="mon-modele:tag">Mon modèle</option>
</select>
```

3. Recompiler l'extension :
```bash
npm run build
```

## 📝 Notes

- Les temps de réponse peuvent varier selon votre machine
- Assurez-vous d'avoir installé les modèles avec `ollama pull`
- La précision peut varier selon le type de texte corrigé