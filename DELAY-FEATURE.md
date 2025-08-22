# Délai intelligent avant correction

## 🕐 Fonctionnalité : Attente de 3 secondes

L'extension attend maintenant **3 secondes** après qu'un espace soit tapé avant d'envoyer la requête de correction. Cela évite de bloquer l'interface pendant que l'utilisateur tape.

> **Note importante** : Ce délai ne s'applique **PAS** aux tests ! Les tests s'exécutent immédiatement pour conserver des temps de réponse précis.

## ✨ Comportement

### 1. **Quand vous tapez un espace**
- Un compte à rebours s'affiche : "Attente 3s..."
- Le compte à rebours se met à jour : "Attente 2s...", "Attente 1s..."
- Après 3 secondes, la correction démarre

### 2. **Si vous continuez à taper**
- Le compte à rebours est **annulé**
- L'indicateur affiche "Annulé"
- Aucune requête n'est envoyée
- L'interface reste **fluide**

### 3. **Après 3 secondes d'inactivité**
- La correction démarre automatiquement
- L'indicateur passe à "Analyse..."
- Les corrections s'appliquent si nécessaire

## 🎯 Avantages

1. **Performance** 
   - ✅ Pas de blocage pendant la frappe
   - ✅ Interface toujours réactive
   - ✅ Moins de requêtes inutiles

2. **Expérience utilisateur**
   - ✅ Frappe naturelle et fluide
   - ✅ Compte à rebours visible
   - ✅ Contrôle total (peut annuler)

3. **Économie de ressources**
   - ✅ Évite les corrections intermédiaires
   - ✅ Réduit la charge sur Ollama
   - ✅ Économise la bande passante

## 📊 Exemples d'utilisation

### Scénario 1 : Frappe continue
```
User tape : "Je suis " (espace)
→ Compte à rebours : 3s...
User continue : "en train"
→ Annulé ✓ (pas de requête)
```

### Scénario 2 : Pause après espace
```
User tape : "Je suis " (espace)
→ Compte à rebours : 3s... 2s... 1s...
User attend...
→ Correction lancée !
```

### Scénario 3 : Plusieurs mots rapidement
```
User tape : "Je suis en train de " (plusieurs espaces rapidement)
→ Tous les comptes à rebours annulés
→ Seul le dernier espace déclenche une correction après 3s
```

## 🔧 Implémentation technique

```typescript
// Délai adaptatif (3s en production, 0 pour les tests)
const CORRECTION_DELAY = typeof process !== 'undefined' && 
                         process.env?.NODE_ENV === 'test' ? 0 : 3000;

// Si délai = 0 (tests), exécuter immédiatement
if (CORRECTION_DELAY === 0) {
  await performCorrection();
} else {
  // Sinon, attendre avec compte à rebours
  correctionTimeout = setTimeout(performCorrection, CORRECTION_DELAY);
}
```

### Tests vs Production

| Environnement | Délai | Compte à rebours | Raison |
|---------------|-------|------------------|--------|
| **Production** | 3s | ✅ Visible | Confort de frappe |
| **Tests** | 0s | ❌ Désactivé | Mesures précises |

## 💡 Conseils d'utilisation

1. **Pour une correction immédiate** : Tapez un espace et attendez 3 secondes
2. **Pour éviter les corrections** : Continuez à taper sans pause
3. **Pour voir le statut** : Regardez l'indicateur visuel dans le champ

## 🚀 Résultat

L'extension est maintenant **beaucoup plus agréable** à utiliser :
- Plus de blocages intempestifs
- Frappe naturelle préservée
- Corrections intelligentes au bon moment

Profitez d'une expérience de frappe **fluide** avec des corrections **non-intrusives** ! 🎉