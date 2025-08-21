# Exemple de sortie des tests avec timing

## Sortie normale des tests

```
🧪 Démarrage des tests de correction avec Ollama...

📝 Test: Correction de 'mai' en 'mais' et 'ALex' en 'Alex'
   Input:    "Je ne suis pas allé chercher mon chien mai je suis allé chercher mon ami ALex !"
   ✅ Résultat: "Je ne suis pas allé chercher mon chien mais je suis allé chercher mon ami Alex !"
   ⏱️  Temps: 342ms
   ✅ SUCCÈS

📝 Test: Participe passé et accord de l'adjectif
   Input:    "Il a manger une pomme vert dans le jardin."
   ✅ Résultat: "Il a mangé une pomme verte dans le jardin."
   ⏱️  Temps: 285ms
   ✅ SUCCÈS

📝 Test: Conjugaison pluriel et orthographe
   Input:    "Les enfants joues dans la cours de l'ecole."
   ✅ Résultat: "Les enfants jouent dans la cour de l'école."
   ⏱️  Temps: 456ms
   ✅ SUCCÈS

[... autres tests ...]

📊 Résumé des tests:
   ✅ Réussis: 16/18
   ❌ Échoués: 2/18
   📈 Taux de réussite: 89%

⏱️  Statistiques de temps de réponse:
   🔹 Moyenne: 378ms
   🔸 Minimum: 245ms
   🔺 Maximum: 623ms
```

## Exemple avec un test échoué

```
📝 Test: C'est/Ces et accord de l'adjectif
   Input:    "C'est temps sont difficile pour tout le monde."
   ❌ Résultat: "C'est un temps difficile pour tout le monde."
   ❌ Attendu:  "Ces temps sont difficiles pour tout le monde."
   ⏱️  Temps: 412ms
   ❌ ÉCHEC
```

## Interprétation des statistiques

- **Moyenne** : Le temps moyen de réponse d'Ollama (378ms dans l'exemple)
- **Minimum** : Le test le plus rapide (245ms)
- **Maximum** : Le test le plus lent (623ms)

Ces métriques permettent de :
- Identifier les tests anormalement lents
- Mesurer la performance globale du modèle
- Détecter des problèmes de performance
- Comparer différentes configurations ou modèles