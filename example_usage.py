"""
Exemple d'utilisation de l'API Groq en remplacement d'Ollama
"""
import asyncio
from groq_client import GroqClient

def example_basic_chat():
    """Exemple de chat basique avec Groq"""
    print("=== Exemple de Chat Basique ===\n")
    
    # Initialiser le client Groq
    client = GroqClient()
    
    # Préparer les messages
    messages = [
        {"role": "system", "content": "Tu es un assistant utile et concis."},
        {"role": "user", "content": "Explique-moi la différence entre Groq et Ollama en quelques points."}
    ]
    
    # Envoyer la requête
    response = client.chat_completion(
        messages=messages,
        model="mixtral-8x7b-32768",
        temperature=0.7,
        max_tokens=500
    )
    
    print(f"Réponse: {response}\n")

def example_streaming():
    """Exemple de streaming de réponse"""
    print("=== Exemple de Streaming ===\n")
    
    client = GroqClient()
    
    messages = [
        {"role": "user", "content": "Écris une histoire courte sur un robot qui apprend à cuisiner."}
    ]
    
    print("Réponse en streaming: ", end="", flush=True)
    for chunk in client.stream_chat_completion(messages, max_tokens=200):
        print(chunk, end="", flush=True)
    print("\n")

def example_conversation():
    """Exemple de conversation multi-tours"""
    print("=== Exemple de Conversation ===\n")
    
    client = GroqClient()
    
    # Historique de conversation
    conversation = [
        {"role": "system", "content": "Tu es un expert en programmation Python."}
    ]
    
    # Premier tour
    conversation.append({"role": "user", "content": "Comment créer une classe en Python?"})
    response1 = client.chat_completion(conversation, temperature=0.5)
    print(f"User: Comment créer une classe en Python?")
    print(f"Assistant: {response1}\n")
    
    # Ajouter la réponse à l'historique
    conversation.append({"role": "assistant", "content": response1})
    
    # Deuxième tour
    conversation.append({"role": "user", "content": "Peux-tu me donner un exemple avec héritage?"})
    response2 = client.chat_completion(conversation, temperature=0.5)
    print(f"User: Peux-tu me donner un exemple avec héritage?")
    print(f"Assistant: {response2}\n")

def example_different_models():
    """Exemple d'utilisation de différents modèles"""
    print("=== Exemple avec Différents Modèles ===\n")
    
    client = GroqClient()
    
    # Lister les modèles disponibles
    models = client.list_models()
    print(f"Modèles disponibles: {models}\n")
    
    # Tester avec différents modèles
    test_models = ["mixtral-8x7b-32768", "llama3-8b-8192", "gemma-7b-it"]
    question = "Qu'est-ce que Python en une phrase?"
    
    for model in test_models:
        try:
            print(f"Modèle: {model}")
            info = client.get_model_info(model)
            print(f"Info: {info['name']} - Context: {info['context_window']} tokens")
            
            response = client.chat_completion(
                [{"role": "user", "content": question}],
                model=model,
                temperature=0.3,
                max_tokens=100
            )
            print(f"Réponse: {response}\n")
        except Exception as e:
            print(f"Erreur avec {model}: {e}\n")

def example_migration_from_ollama():
    """
    Exemple montrant comment migrer du code Ollama vers Groq
    """
    print("=== Migration Ollama -> Groq ===\n")
    
    print("Code Ollama original:")
    print("""
    # Avec Ollama
    import ollama
    
    response = ollama.chat(model='llama2', messages=[
        {
            'role': 'user',
            'content': 'Pourquoi le ciel est-il bleu?',
        },
    ])
    print(response['message']['content'])
    """)
    
    print("\nCode Groq équivalent:")
    print("""
    # Avec Groq
    from groq_client import GroqClient
    
    client = GroqClient()
    response = client.chat_completion(
        messages=[
            {
                'role': 'user',
                'content': 'Pourquoi le ciel est-il bleu?',
            },
        ],
        model='llama2-70b-4096'  # ou un autre modèle disponible
    )
    print(response)
    """)
    
    # Exécution réelle
    print("\nExécution avec Groq:")
    client = GroqClient()
    response = client.chat_completion(
        messages=[
            {
                'role': 'user',
                'content': 'Pourquoi le ciel est-il bleu?',
            },
        ],
        model='llama3-8b-8192',
        temperature=0.5,
        max_tokens=200
    )
    print(f"Réponse: {response}")

if __name__ == "__main__":
    print("Exemples d'utilisation de Groq API\n")
    print("=" * 50)
    
    # Vérifier que la clé API est configurée
    import os
    if not os.getenv("GROQ_API_KEY"):
        print("⚠️  ATTENTION: La variable d'environnement GROQ_API_KEY n'est pas définie!")
        print("Veuillez configurer votre clé API Groq dans le fichier .env")
        print("Vous pouvez obtenir une clé API gratuite sur: https://console.groq.com/keys")
        exit(1)
    
    try:
        # Exécuter les exemples
        example_basic_chat()
        print("\n" + "=" * 50 + "\n")
        
        example_streaming()
        print("\n" + "=" * 50 + "\n")
        
        example_conversation()
        print("\n" + "=" * 50 + "\n")
        
        example_different_models()
        print("\n" + "=" * 50 + "\n")
        
        example_migration_from_ollama()
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        print("Assurez-vous que votre clé API Groq est valide et que vous avez une connexion internet.")