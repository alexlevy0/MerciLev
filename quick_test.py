"""
Script de test rapide pour vérifier l'installation et la configuration Groq
"""
import os
import sys
from groq_client import GroqClient

def test_groq_setup():
    """Test la configuration de Groq"""
    print("🔍 Test de configuration Groq\n")
    
    # 1. Vérifier la clé API
    print("1. Vérification de la clé API...")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("❌ GROQ_API_KEY non trouvée dans l'environnement")
        print("   → Créez un fichier .env basé sur .env.example")
        print("   → Ajoutez votre clé API depuis https://console.groq.com/keys")
        return False
    elif api_key == "your_groq_api_key_here":
        print("❌ GROQ_API_KEY n'a pas été modifiée")
        print("   → Remplacez 'your_groq_api_key_here' par votre vraie clé API")
        return False
    else:
        print(f"✅ Clé API trouvée ({api_key[:8]}...)")
    
    # 2. Tester l'initialisation du client
    print("\n2. Initialisation du client...")
    try:
        client = GroqClient()
        print("✅ Client initialisé avec succès")
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation: {e}")
        return False
    
    # 3. Tester un appel simple
    print("\n3. Test d'appel API...")
    try:
        response = client.chat_completion(
            messages=[{"role": "user", "content": "Réponds juste 'OK' si tu me reçois."}],
            model="mixtral-8x7b-32768",
            max_tokens=10,
            temperature=0
        )
        print(f"✅ Réponse reçue: {response.strip()}")
    except Exception as e:
        print(f"❌ Erreur lors de l'appel API: {e}")
        print("   → Vérifiez que votre clé API est valide")
        print("   → Vérifiez votre connexion internet")
        return False
    
    # 4. Lister les modèles
    print("\n4. Modèles disponibles:")
    models = client.list_models()
    for model in models:
        info = client.get_model_info(model)
        print(f"   • {model}: {info.get('name', 'N/A')} ({info.get('context_window', 'N/A')} tokens)")
    
    print("\n✅ Tous les tests sont passés ! Groq est prêt à l'emploi.")
    print("\n📖 Prochaines étapes:")
    print("   1. Explorez les exemples: python example_usage.py")
    print("   2. Consultez le README.md pour plus d'informations")
    print("   3. Commencez à coder avec Groq !")
    
    return True

if __name__ == "__main__":
    print("=" * 50)
    print("Test de Configuration Groq API")
    print("=" * 50)
    
    success = test_groq_setup()
    
    if not success:
        print("\n⚠️  Configuration incomplète. Suivez les instructions ci-dessus.")
        sys.exit(1)
    else:
        print("\n🎉 Configuration réussie !")
        sys.exit(0)