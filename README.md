# Migration d'Ollama vers Groq API

Ce projet fournit une interface simple pour utiliser l'API Groq en remplacement d'Ollama pour l'inférence de modèles de langage.

## 🚀 Pourquoi Groq au lieu d'Ollama ?

### Avantages de Groq :
- **Performance ultra-rapide** : Groq utilise des puces LPU (Language Processing Units) spécialisées offrant une vitesse d'inférence exceptionnelle
- **Pas d'installation locale** : Contrairement à Ollama, pas besoin de télécharger des modèles de plusieurs GB
- **API cloud** : Accessible depuis n'importe où, pas de ressources locales requises
- **Modèles de pointe** : Accès à Mixtral, Llama 3, Gemma et plus
- **Tarification généreuse** : Tier gratuit très généreux pour commencer

### Comparaison :
| Caractéristique | Ollama | Groq |
|----------------|---------|------|
| Installation | Locale (GB de stockage) | API Cloud |
| Vitesse | Dépend du hardware local | Ultra-rapide (LPU) |
| Modèles | Téléchargement manuel | Accès immédiat |
| GPU requis | Recommandé | Non |
| Coût | Gratuit (ressources locales) | Tier gratuit généreux |

## 📦 Installation

1. Clonez ce repository
2. Installez les dépendances :
```bash
pip install -r requirements.txt
```

3. Configurez votre clé API :
```bash
cp .env.example .env
# Éditez .env et ajoutez votre clé API Groq
```

4. Obtenez votre clé API gratuite sur : https://console.groq.com/keys

## 🔧 Utilisation

### Client Groq de base

```python
from groq_client import GroqClient

# Initialiser le client
client = GroqClient()

# Chat simple
response = client.chat_completion(
    messages=[
        {"role": "user", "content": "Bonjour, comment vas-tu ?"}
    ],
    model="mixtral-8x7b-32768"
)
print(response)
```

### Migration depuis Ollama

**Code Ollama original :**
```python
import ollama

response = ollama.chat(model='llama2', messages=[
    {'role': 'user', 'content': 'Explique la récursion'},
])
print(response['message']['content'])
```

**Code Groq équivalent :**
```python
from groq_client import GroqClient

client = GroqClient()
response = client.chat_completion(
    messages=[
        {'role': 'user', 'content': 'Explique la récursion'},
    ],
    model='llama2-70b-4096'
)
print(response)
```

### Streaming de réponses

```python
# Streaming avec Groq
for chunk in client.stream_chat_completion(messages):
    print(chunk, end="", flush=True)
```

## 🤖 Modèles disponibles

| Modèle | Context Window | Description |
|--------|----------------|-------------|
| mixtral-8x7b-32768 | 32,768 tokens | Mixture of Experts, excellent pour les tâches complexes |
| llama3-70b-8192 | 8,192 tokens | Llama 3 70B, très performant |
| llama3-8b-8192 | 8,192 tokens | Llama 3 8B, rapide et efficace |
| llama2-70b-4096 | 4,096 tokens | Llama 2 70B, modèle stable |
| gemma-7b-it | 8,192 tokens | Gemma de Google, optimisé pour les instructions |
| gemma2-9b-it | 8,192 tokens | Gemma 2 amélioré |

## 📝 Exemples

Exécutez les exemples fournis :
```bash
python example_usage.py
```

Les exemples incluent :
- Chat basique
- Streaming de réponses
- Conversations multi-tours
- Utilisation de différents modèles
- Guide de migration depuis Ollama

## 🔄 Guide de migration complet

### 1. Initialisation
```python
# Ollama
import ollama
# Pas de configuration nécessaire

# Groq
from groq_client import GroqClient
client = GroqClient()  # Utilise GROQ_API_KEY de l'environnement
```

### 2. Chat simple
```python
# Ollama
response = ollama.chat(model='llama2', messages=messages)
content = response['message']['content']

# Groq
response = client.chat_completion(messages=messages, model='llama2-70b-4096')
content = response  # Retourne directement le contenu
```

### 3. Streaming
```python
# Ollama
stream = ollama.chat(model='llama2', messages=messages, stream=True)
for chunk in stream:
    print(chunk['message']['content'], end='')

# Groq
for chunk in client.stream_chat_completion(messages=messages):
    print(chunk, end='')
```

### 4. Paramètres
```python
# Ollama
response = ollama.chat(
    model='llama2',
    messages=messages,
    options={
        'temperature': 0.7,
        'top_p': 0.9,
    }
)

# Groq
response = client.chat_completion(
    messages=messages,
    model='llama2-70b-4096',
    temperature=0.7,
    top_p=0.9,
    max_tokens=1024
)
```

## 💡 Conseils

1. **Performance** : Groq est optimisé pour la vitesse. Profitez-en pour des applications temps réel.
2. **Limites** : Respectez les limites de rate du tier gratuit (consultez la documentation Groq).
3. **Modèles** : Mixtral-8x7b offre le meilleur rapport qualité/performance pour la plupart des cas.
4. **Contexte** : Utilisez des modèles avec grandes fenêtres de contexte pour les conversations longues.

## 🔒 Sécurité

- Ne commitez jamais votre clé API
- Utilisez des variables d'environnement
- Ajoutez `.env` à votre `.gitignore`

## 📚 Ressources

- [Documentation Groq](https://console.groq.com/docs)
- [Console Groq](https://console.groq.com)
- [Playground Groq](https://console.groq.com/playground)

## 🤝 Support

Pour des questions ou problèmes :
1. Consultez les exemples dans `example_usage.py`
2. Vérifiez la [documentation officielle Groq](https://console.groq.com/docs)
3. Assurez-vous que votre clé API est valide et active