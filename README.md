# Extension Chrome avec API Groq

Cette extension Chrome utilise l'API Groq pour fournir une assistance IA directement dans votre navigateur.

## Installation

1. Clonez ou téléchargez ce dépôt
2. Ouvrez Chrome et accédez à `chrome://extensions/`
3. Activez le "Mode développeur" en haut à droite
4. Cliquez sur "Charger l'extension non empaquetée"
5. Sélectionnez le dossier contenant les fichiers de l'extension

## Configuration

### Obtenir une clé API Groq

1. Rendez-vous sur [console.groq.com](https://console.groq.com)
2. Créez un compte ou connectez-vous
3. Accédez à la section "API Keys"
4. Créez une nouvelle clé API
5. Copiez la clé générée

### Configurer l'extension

1. Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
2. Collez votre clé API Groq dans le champ prévu
3. Cliquez sur "Sauvegarder"

## Utilisation

- **Sélection du modèle** : Choisissez parmi les modèles disponibles (Mixtral, LLaMA2, Gemma, etc.)
- **Chat** : Tapez votre message et appuyez sur Entrée ou cliquez sur "Envoyer"
- **Historique** : Les conversations sont sauvegardées localement

## Modèles disponibles

- **Mixtral 8x7B** : Modèle haute performance pour des réponses complexes
- **LLaMA2 70B** : Modèle de Meta optimisé pour diverses tâches
- **Gemma 7B** : Modèle compact et efficace de Google
- **LLaMA3 70B** : Dernière version de LLaMA avec performances améliorées
- **LLaMA3 8B** : Version plus légère de LLaMA3

## Différences avec Ollama

| Fonctionnalité | Ollama | Groq |
|----------------|--------|------|
| Hébergement | Local | Cloud |
| Performance | Dépend du hardware | Ultra-rapide |
| Configuration | Installation locale requise | Clé API seulement |
| Coût | Gratuit (coût hardware) | Basé sur l'utilisation |
| Modèles | Open source | Sélection optimisée |

## Structure du projet

```
├── manifest.json       # Configuration de l'extension Chrome
├── background.js       # Service worker pour les appels API
├── popup.html         # Interface utilisateur
├── popup.js           # Logique de l'interface
├── popup.css          # Styles de l'interface
└── README.md          # Documentation
```

## Sécurité

- La clé API est stockée localement dans le stockage Chrome
- Toutes les communications avec l'API Groq sont chiffrées (HTTPS)
- Aucune donnée n'est partagée avec des tiers

## Développement

Pour modifier l'extension :

1. Éditez les fichiers nécessaires
2. Rechargez l'extension dans `chrome://extensions/`
3. Testez les modifications

## Dépannage

- **Erreur de clé API** : Vérifiez que votre clé est valide et active
- **Pas de réponse** : Vérifiez votre connexion internet
- **Extension ne charge pas** : Assurez-vous que le mode développeur est activé

## Licence

MIT License