# Contrôle utilisateur de l'extension

## 🎯 Nouvelle approche : L'utilisateur décide !

Au lieu d'exclure automatiquement des sites, l'extension offre maintenant un **contrôle total** à l'utilisateur.

## 🛠️ Page d'options

Accessible via :
- Le bouton "⚙️ Options avancées" dans le popup
- chrome://extensions → Correcteur Français Ollama → Détails → Options de l'extension

### 1. **Modes de fonctionnement**

- **Normal** : Fonctionne normalement (30 éléments max)
- **Performance** : Mode léger (10 éléments max)
- **Intelligent** : S'adapte selon la complexité du site

### 2. **Configuration par site**

Pour chaque site, vous pouvez choisir :
- **Normal** : Extension complète
- **Performance** : Version allégée
- **Désactivé** : Pas de correction

### 3. **Options de performance**

- ✅ Limiter le nombre d'éléments observés
- ✅ Désactiver l'observation récursive
- ✅ Afficher les infos de debug

## 📋 Sites pré-configurés

Par défaut, certains sites sont configurés pour éviter les problèmes :

| Site | Configuration par défaut | Raison |
|------|-------------------------|--------|
| Slack | Désactivé | Éditeur complexe custom |
| Discord | Désactivé | Slate.js editor |
| Messenger | Désactivé | React virtual DOM |
| Facebook | Performance | Beaucoup d'éléments |
| Teams | Désactivé | Éditeur propriétaire |
| Notion | Performance | Blocs dynamiques |
| Gmail | Performance | Interface complexe |

**Mais vous pouvez les activer si vous voulez !**

## 🚀 Comment personnaliser

### Activer l'extension sur Slack :
1. Ouvrir les options
2. Trouver "slack.com" dans la liste
3. Changer de "Désactivé" à "Performance" ou "Normal"
4. L'extension sera active au prochain chargement

### Ajouter un nouveau site :
1. Entrer le domaine (ex: `example.com`)
2. Cliquer sur "Ajouter"
3. Choisir le mode souhaité

### Mode intelligent :
- Détecte automatiquement si un site a plus de 50 éléments éditables
- Passe en mode Performance si nécessaire
- Idéal pour la plupart des utilisateurs

## 🔄 Changements appliqués

Les paramètres sont sauvegardés instantanément et s'appliquent :
- Immédiatement pour les nouveaux onglets
- Au rechargement pour les onglets existants

## 💡 Recommandations

### Sites simples (blogs, forums) :
→ Mode **Normal**

### Sites complexes (Gmail, Facebook) :
→ Mode **Performance**

### Éditeurs web (Slack, Notion) :
→ Mode **Désactivé** ou **Performance** selon vos besoins

### Incertain ?
→ Mode **Intelligent** (s'adapte automatiquement)

## 🛡️ Avantages de cette approche

1. **Liberté** : Vous décidez où l'extension fonctionne
2. **Performance** : Mode adapté à chaque site
3. **Flexibilité** : Changez à tout moment
4. **Transparence** : Voyez exactement ce qui se passe

## 🐛 Un site pose problème ?

1. Passez-le en mode **Performance**
2. Si ça ne suffit pas, **Désactivez-le**
3. Vous pouvez toujours le réactiver plus tard

L'extension est maintenant **entièrement sous votre contrôle** ! 🎮