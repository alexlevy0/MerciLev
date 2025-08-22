# Problèmes identifiés avec qwen2.5:3b

## ❌ Résultats des tests : 55% de réussite

### 1. **Ajout de guillemets non désirés**

Le modèle ajoute systématiquement des guillemets autour des phrases :

```
Input:  "C'est temps sont difficile pour tout le monde."
Output: ""Ces temps sont difficiles pour tout le monde.""  ❌
```

**Solution appliquée** : 
- Ajout explicite dans le prompt : `NE JAMAIS ajouter de guillemets ("") autour de la phrase`
- Exemples sans guillemets dans les corrections

### 2. **Reformulations non demandées**

Le modèle change la structure des phrases :

```
Input:  "Quand est-ce que tu va venir me voir ?"
Output: "Quand es-tu prévu de venir me voir ?"  ❌
Attendu: "Quand est-ce que tu vas venir me voir ?"  ✅
```

**Solution appliquée** :
- Règle ajoutée : `NE JAMAIS reformuler`
- Exemple spécifique dans le prompt

### 3. **Changements de mots non nécessaires**

```
Input:  "J'ai oublié mais cahiers"
Output: "J'ai oublié mon cahier"  ❌ (singulier au lieu de pluriel)
Attendu: "J'ai oublié mes cahiers"  ✅
```

### 4. **Changement de "on" en "nous"**

```
Input:  "Il y a beaucoup de monde, on n'a pas de place."
Output: "Il y a beaucoup de monde, nous n'avons pas de place."  ❌
```

## 🔧 Optimisations appliquées

### Configuration spécifique pour Qwen

```typescript
[MODELS.QWEN25_3B]: {
  temperature: 0.1,  // Plus déterministe
  top_p: 0.9
}
```

### Prompt ultra-simplifié (v2)

```typescript
if (MODEL_NAME === 'qwen2.5:3b') {
  system = 'Tu corriges les fautes de français. Réponds UNIQUEMENT avec la phrase corrigée.';
  prompt = sentence; // Juste la phrase, pas de contexte
}
```

### Nettoyage automatique des guillemets

```typescript
// Enlever les guillemets ajoutés par Qwen
result = result.replace(/^[""]|[""]$/g, '');
result = result.replace(/^""|""$/g, '');
```

### Approche en 3 étapes

1. **Prompt minimal** : Plus c'est simple, mieux c'est
2. **Pas de contexte** : Juste la phrase à corriger
3. **Post-traitement** : Nettoyer les guillemets automatiquement

## 📊 Comparaison des erreurs

| Type d'erreur | gemma3n:e2b | qwen2.5:3b |
|---------------|-------------|------------|
| Guillemets ajoutés | ❌ Non | ✅ Oui |
| Reformulations | ❌ Non | ✅ Oui |
| Changements excessifs | ❌ Non | ✅ Oui |
| Respect du prompt | ✅ 100% | ⚠️ 55% |

## 🚦 Recommandations

### Pour améliorer qwen2.5:3b

1. **Tester avec température 0** : Encore plus déterministe
2. **Prompt système différent** : Peut-être plus court et direct
3. **Format de réponse** : Forcer un format JSON ?

### Alternative

Si les problèmes persistent, considérer :
- Rester sur `gemma3n:e2b` par défaut (100% de réussite)
- Utiliser Qwen pour d'autres tâches (traduction, résumé)
- Attendre une mise à jour du modèle

## 💡 Conclusion

Qwen2.5:3b semble avoir des comportements par défaut qui ne correspondent pas bien aux besoins de correction orthographique pure. Il tend à :
- Sur-formater (guillemets)
- Sur-corriger (reformulations)
- Ignorer certaines instructions

**Statut actuel** : Utilisable mais nécessite plus d'ajustements que les modèles Gemma.