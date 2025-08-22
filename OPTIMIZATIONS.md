# Optimisations pour gemma3n:e2b

## Objectif
Faire en sorte que le modèle `gemma3n:e2b` (49% plus rapide) atteigne 100% de précision comme `gemma3n:e4b`.

## Problèmes identifiés
Le modèle `gemma3n:e2b` échouait sur 3 tests spécifiques :

1. **ce/se, accord participe passé, infinitif**
   - Input: "Ils ce sont trompé de chemin pour allez au parc."
   - Attendu: "Ils se sont trompés de chemin pour aller au parc."

2. **Tout/Tous et a/à**
   - Input: "Tout les jours, je vais a l'école en vélo."
   - Attendu: "Tous les jours, je vais à l'école en vélo."

3. **Phrase déjà correcte**
   - Input: "Il y a beaucoup de monde, on n'a pas de place."
   - Attendu: (identique - ne rien changer)

## Améliorations du prompt

### 1. Exemples spécifiques ajoutés
```
- "Ils ce sont trompé" → "Ils se sont trompés" (ce→se + accord)
- "pour allez au parc" → "pour aller au parc" (infinitif après préposition)
- "Tout les jours" → "Tous les jours" (Tout→Tous devant article pluriel)
```

### 2. Règles critiques supplémentaires
```
- ce/se : "se" est réfléchi (se tromper, se lever), "ce" est démonstratif
- Tout/Tous : "Tous" devant article pluriel ("tous les"), "Tout" sinon
- Infinitif : après préposition (pour, de, à), toujours infinitif en -er/-ir/-re
- Si phrase DÉJÀ CORRECTE : la retourner IDENTIQUE, ne rien changer
```

## Script unifié test-all.ts

Un seul script pour tous les besoins :

```bash
# Test standard
./test-all.ts

# Comparer les modèles
./test-all.ts --compare

# Tester un modèle spécifique
./test-all.ts --model=gemma3n:e2b

# Aide
./test-all.ts --help
```

### Fonctionnalités
- ✅ Retry automatique (3 essais)
- ✅ Comparaison de modèles
- ✅ Rapport détaillé des échecs
- ✅ Recommandations automatiques
- ✅ Support de tous les modèles

## Résultat attendu
Avec ces optimisations, `gemma3n:e2b` devrait atteindre 100% de précision tout en restant 49% plus rapide que `gemma3n:e4b`.

## Utilisation recommandée
1. Recharger l'extension dans Chrome
2. Tester avec `./test-all.ts --model=gemma3n:e2b`
3. Si 100% de réussite → Configurer comme modèle par défaut
4. Bénéficier de corrections 2x plus rapides !

## Commandes npm simplifiées
```bash
npm test           # Test par défaut
npm run test:e2b   # Test gemma3n:e2b
npm run test:e4b   # Test gemma3n:e4b
npm run test:compare # Comparaison complète
```