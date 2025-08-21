# Exemple de sortie de comparaison des modèles

```
🔬 Comparaison des modèles Ollama pour la correction française
════════════════════════════════════════════════════════════

🤖 Test du modèle: gemma3n:e4b
────────────────────────────────────────────────────────────
   20 tests à exécuter...

  [01/20] Correction de 'mai' en 'mais' et 'ALex' en 'Alex'..... ✅  342ms
  [02/20] Participe passé et accord de l'adjectif............... ✅  285ms
  [03/20] Conjugaison pluriel et orthographe.................... ✅  321ms
  [04/20] Homophones sa/ça et a/à............................... ✅  298ms
  [05/20] Accord participe passé, se/ce, travaille/travail...... ✅  356ms
  [06/20] Participe passé sans accord, mais/mes................. ✅  267ms
  [07/20] Participe passé avec avoir, vacance/vacances.......... ✅  289ms
  [08/20] C'est/Ces et accord de l'adjectif..................... ❌  412ms
  [09/20] Subjonctif après 'il faut que'........................ ✅  334ms
  [10/20] Fautes multiples : phaute, accord adjectif, se/ce..... ✅  378ms
  [11/20] Négation et parce que................................. ✅  298ms
  [12/20] ce/se, accord participe passé, infinitif.............. ✅  423ms
  [13/20] Tout/Tous et a/à...................................... ✅  312ms
  [14/20] Phrase déjà correcte (test de non-modification)....... ❌  389ms
  [15/20] Conjugaison 2e personne singulier..................... ✅  276ms
  [16/20] Espaces manquants, accord adjectif et nom............. ✅  398ms
  [17/20] Multiples espaces manquants........................... ✅  345ms
  [18/20] Espaces manquants et négation......................... ✅  367ms
  [19/20] C'est + nom pluriel = Ces (cas simple)................ ✅  298ms
  [20/20] Phrase avec 'on' déjà correcte........................ ✅  334ms

🤖 Test du modèle: gemma3n:e2b
────────────────────────────────────────────────────────────
   20 tests à exécuter...

  [01/20] Correction de 'mai' en 'mais' et 'ALex' en 'Alex'..... ✅  245ms
  [02/20] Participe passé et accord de l'adjectif............... ✅  198ms
  [03/20] Conjugaison pluriel et orthographe.................... ✅  234ms
  [04/20] Homophones sa/ça et a/à............................... ✅  189ms
  [05/20] Accord participe passé, se/ce, travaille/travail...... ❌  256ms
  [06/20] Participe passé sans accord, mais/mes................. ✅  178ms
  [07/20] Participe passé avec avoir, vacance/vacances.......... ✅  201ms
  [08/20] C'est/Ces et accord de l'adjectif..................... ✅  267ms
  [09/20] Subjonctif après 'il faut que'........................ ✅  223ms
  [10/20] Fautes multiples : phaute, accord adjectif, se/ce..... ❌  298ms
  [11/20] Négation et parce que................................. ✅  187ms
  [12/20] ce/se, accord participe passé, infinitif.............. ✅  312ms
  [13/20] Tout/Tous et a/à...................................... ✅  198ms
  [14/20] Phrase déjà correcte (test de non-modification)....... ✅  234ms
  [15/20] Conjugaison 2e personne singulier..................... ✅  167ms
  [16/20] Espaces manquants, accord adjectif et nom............. ❌  289ms
  [17/20] Multiples espaces manquants........................... ✅  245ms
  [18/20] Espaces manquants et négation......................... ✅  256ms
  [19/20] C'est + nom pluriel = Ces (cas simple)................ ✅  189ms
  [20/20] Phrase avec 'on' déjà correcte........................ ✅  223ms


📊 RÉSULTATS DÉTAILLÉS
════════════════════════════════════════════════════════════════════════════════

📊 Résumé des tests (20 tests au total):
   ✅ Réussis par tous: 14 tests
   ❌ Échoués par tous: 0 tests
   ⚡ Différences entre modèles: 6 tests

🔄 Différences entre modèles:

   "Accord participe passé, se/ce, travaille/travail"
     ✅ Réussi par: gemma3n:e4b
     ❌ Échoué par: gemma3n:e2b

   "C'est/Ces et accord de l'adjectif"
     ✅ Réussi par: gemma3n:e2b
     ❌ Échoué par: gemma3n:e4b

   "Fautes multiples : phaute, accord adjectif, se/ce"
     ✅ Réussi par: gemma3n:e4b
     ❌ Échoué par: gemma3n:e2b

   "Phrase déjà correcte (test de non-modification)"
     ✅ Réussi par: gemma3n:e2b
     ❌ Échoué par: gemma3n:e4b

   "Espaces manquants, accord adjectif et nom"
     ✅ Réussi par: gemma3n:e4b
     ❌ Échoué par: gemma3n:e2b


🏆 COMPARAISON DES MODÈLES
════════════════════════════════════════════════════════════════════════════════

📈 Performance et Précision:

┌─────────────────────┬────────────┬──────────┬──────────┬──────────┬──────────┐
│ Modèle              │ Score      │ Moy (ms) │ Min (ms) │ Max (ms) │ Total(s) │
├─────────────────────┼────────────┼──────────┼──────────┼──────────┼──────────┤
│ gemma3n:e4b         │ 18/20 (90.0%) │      339 │      267 │      423 │      6.8 │
│ gemma3n:e2b         │ 17/20 (85.0%) │      231 │      167 │      312 │      4.6 │
└─────────────────────┴────────────┴──────────┴──────────┴──────────┴──────────┘

🎯 Analyse:
   🥇 Meilleure précision: gemma3n:e4b (90.0%)
   ⚡ Plus rapide: gemma3n:e2b (231ms en moyenne)
   📊 Différence de vitesse: 31.9% plus rapide

💡 Recommandation:
   ➡️  gemma3n:e4b recommandé pour la précision
   ➡️  gemma3n:e2b si la vitesse est prioritaire
```

## Points clés de l'analyse

1. **Volume de tests** : 20 tests complets couvrant tous les aspects de la correction française
2. **Différences de performance** : gemma3n:e2b est environ 32% plus rapide
3. **Différences de précision** : gemma3n:e4b a un taux de réussite légèrement supérieur (90% vs 85%)
4. **Tests divergents** : 6 tests sur 20 donnent des résultats différents selon le modèle
5. **Recommandation contextuelle** : Le choix dépend de vos priorités (vitesse vs précision)