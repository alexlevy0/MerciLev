"""
Client pour l'API Groq - Remplace Ollama pour l'inférence LLM
"""
import os
from typing import List, Dict, Optional, Union
from groq import Groq
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

class GroqClient:
    """Client pour interagir avec l'API Groq"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le client Groq
        
        Args:
            api_key: Clé API Groq (optionnel, peut être définie via GROQ_API_KEY)
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("Clé API Groq non fournie. Définissez GROQ_API_KEY dans votre environnement.")
        
        self.client = Groq(api_key=self.api_key)
        
    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "mixtral-8x7b-32768",
        temperature: float = 0.7,
        max_tokens: int = 1024,
        stream: bool = False,
        **kwargs
    ) -> Union[str, Dict]:
        """
        Envoie une requête de chat completion à l'API Groq
        
        Args:
            messages: Liste des messages de la conversation
            model: Modèle à utiliser (par défaut: mixtral-8x7b-32768)
            temperature: Température pour la génération (0-2)
            max_tokens: Nombre maximum de tokens à générer
            stream: Si True, retourne un générateur pour le streaming
            **kwargs: Autres paramètres supportés par l'API Groq
            
        Returns:
            Réponse du modèle sous forme de string ou dictionnaire complet
        """
        try:
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=stream,
                **kwargs
            )
            
            if stream:
                return chat_completion
            
            return chat_completion.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"Erreur lors de l'appel à l'API Groq: {str(e)}")
    
    def stream_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "mixtral-8x7b-32768",
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs
    ):
        """
        Stream la réponse du modèle token par token
        
        Args:
            messages: Liste des messages de la conversation
            model: Modèle à utiliser
            temperature: Température pour la génération
            max_tokens: Nombre maximum de tokens à générer
            **kwargs: Autres paramètres supportés par l'API Groq
            
        Yields:
            Chunks de la réponse au fur et à mesure
        """
        stream = self.chat_completion(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
            **kwargs
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield chunk.choices[0].delta.content
    
    def list_models(self) -> List[str]:
        """
        Liste les modèles disponibles sur Groq
        
        Returns:
            Liste des identifiants de modèles disponibles
        """
        available_models = [
            "mixtral-8x7b-32768",
            "llama3-8b-8192",
            "llama3-70b-8192",
            "llama2-70b-4096",
            "gemma-7b-it",
            "gemma2-9b-it"
        ]
        return available_models
    
    def get_model_info(self, model: str) -> Dict[str, Union[str, int]]:
        """
        Retourne les informations sur un modèle spécifique
        
        Args:
            model: Identifiant du modèle
            
        Returns:
            Dictionnaire avec les informations du modèle
        """
        model_info = {
            "mixtral-8x7b-32768": {
                "name": "Mixtral 8x7B",
                "context_window": 32768,
                "description": "Modèle Mixture of Experts performant avec une grande fenêtre de contexte"
            },
            "llama3-8b-8192": {
                "name": "Llama 3 8B",
                "context_window": 8192,
                "description": "Version 8B de Llama 3, rapide et efficace"
            },
            "llama3-70b-8192": {
                "name": "Llama 3 70B",
                "context_window": 8192,
                "description": "Version 70B de Llama 3, plus puissante"
            },
            "llama2-70b-4096": {
                "name": "Llama 2 70B",
                "context_window": 4096,
                "description": "Llama 2 70B, modèle robuste et bien testé"
            },
            "gemma-7b-it": {
                "name": "Gemma 7B",
                "context_window": 8192,
                "description": "Modèle Gemma de Google, optimisé pour les instructions"
            },
            "gemma2-9b-it": {
                "name": "Gemma 2 9B",
                "context_window": 8192,
                "description": "Version améliorée de Gemma avec 9B paramètres"
            }
        }
        
        return model_info.get(model, {"error": "Modèle non trouvé"})