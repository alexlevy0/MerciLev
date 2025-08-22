# Exemple de sortie avec système de retry

## Cas 1 : Test réussi au premier essai

```
📝 Test: Correction de 'mai' en 'mais' et 'ALex' en 'Alex'
   Input:    "Je ne suis pas allé chercher mon chien mai je suis allé chercher mon ami ALex !"
   ✅ Résultat: "Je ne suis pas allé chercher mon chien mais je suis allé chercher mon ami Alex !"
   ⏱️  Temps: 342ms
   ✅ SUCCÈS
```

## Cas 2 : Test réussi après retry

```
📝 Test: C'est/Ces et accord de l'adjectif
   Input:    "C'est temps sont difficile pour tout le monde."
   🔄 Essai 1/3 échoué, nouvelle tentative...
   🔄 Essai 2/3 échoué, nouvelle tentative...
   ✅ Résultat: "Ces temps sont difficiles pour tout le monde."
   ⏱️  Temps: 389ms
   🔄 Réussi après 3 essai(s)
   ✅ SUCCÈS
```

## Cas 3 : Échec après 3 essais

```
📝 Test: Phrase déjà correcte (test de non-modification)
   Input:    "Il y a beaucoup de monde, on n'a pas de place."
   🔄 Essai 1/3 échoué, nouvelle tentative...
   🔄 Essai 2/3 échoué, nouvelle tentative...
   ❌ Résultat: "Il y a beaucoup de monde, nous n'avons pas de place."
   ❌ Attendu:  "Il y a beaucoup de monde, on n'a pas de place."
   ⏱️  Temps: 412ms
   ❌ ÉCHEC après 3 essais
```

## Résumé final avec tests échoués

```
📊 Résumé des tests:
   ✅ Réussis: 18/20
   ❌ Échoués: 2/20
   📈 Taux de réussite: 90%

⏱️  Statistiques de temps de réponse:
   🔹 Moyenne: 356ms
   🔸 Minimum: 245ms
   🔺 Maximum: 489ms

🔍 Tests échoués après 3 essais (à corriger dans le prompt):
────────────────────────────────────────────────────────────

❌ "C'est/Ces et accord de l'adjectif"
   Input:    "C'est temps sont difficile pour tout le monde."
   Attendu:  "Ces temps sont difficiles pour tout le monde."
   Obtenu:   "C'est un temps difficile pour tout le monde."

❌ "Phrase déjà correcte (test de non-modification)"
   Input:    "Il y a beaucoup de monde, on n'a pas de place."
   Attendu:  "Il y a beaucoup de monde, on n'a pas de place."
   Obtenu:   "Il y a beaucoup de monde, nous n'avons pas de place."

💡 Ces tests nécessitent probablement un ajustement du prompt.
```

## Avantages du système de retry

1. **Fiabilité accrue** : Élimine les faux négatifs dus à la latence réseau ou charge serveur
2. **Identification précise** : Les vrais problèmes persistants sont clairement identifiés
3. **Gain de temps** : Pas besoin de relancer manuellement les tests échoués
4. **Traçabilité** : Chaque retry est documenté dans la sortie
5. **Analyse facilitée** : Les échecs persistants sont regroupés pour correction

## Configuration

Le système peut être configuré dans `test-config.ts` :

```typescript
export const TEST_CONFIG = {
  MAX_RETRIES: 3,        // Nombre maximum d'essais
  RETRY_DELAY: 500,      // Délai entre les essais (ms)
  SHOW_RETRY_DETAILS: true,  // Afficher les détails des retries
  SHOW_FAILED_SUMMARY: true, // Afficher le résumé des échecs
};
```