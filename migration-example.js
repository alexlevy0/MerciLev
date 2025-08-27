// Exemple de migration depuis Ollama vers Groq

// ========== AVANT : Utilisation d'Ollama ==========

// Configuration Ollama (ancienne méthode)
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

async function sendToOllamaOld(prompt, model = 'llama2') {
  const response = await fetch(OLLAMA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      stream: false
    })
  });
  
  const data = await response.json();
  return data.response;
}

// ========== APRÈS : Utilisation de Groq ==========

// Configuration Groq (nouvelle méthode)
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = 'votre-clé-api-groq'; // À obtenir sur console.groq.com

async function sendToGroqNew(messages, model = 'mixtral-8x7b-32768') {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: messages, // Format OpenAI : [{role: 'user', content: '...'}]
      temperature: 0.7,
      max_tokens: 2048,
      stream: false
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// ========== Comparaison des appels ==========

// Exemple avec Ollama (ancien)
async function exempleOllama() {
  try {
    const response = await sendToOllamaOld(
      "Explique-moi ce qu'est Node.js",
      "llama2"
    );
    console.log("Réponse Ollama:", response);
  } catch (error) {
    console.error("Erreur Ollama:", error);
  }
}

// Exemple avec Groq (nouveau)
async function exempleGroq() {
  try {
    const response = await sendToGroqNew(
      [
        { role: "user", content: "Explique-moi ce qu'est Node.js" }
      ],
      "mixtral-8x7b-32768"
    );
    console.log("Réponse Groq:", response);
  } catch (error) {
    console.error("Erreur Groq:", error);
  }
}

// ========== Principales différences ==========

/*
1. URL de l'API :
   - Ollama : http://localhost:11434/api/generate (local)
   - Groq : https://api.groq.com/openai/v1/chat/completions (cloud)

2. Authentification :
   - Ollama : Aucune (local)
   - Groq : Bearer token (clé API)

3. Format des messages :
   - Ollama : Simple string "prompt"
   - Groq : Format OpenAI avec tableau de messages [{role, content}]

4. Modèles disponibles :
   - Ollama : Modèles téléchargés localement (llama2, mistral, etc.)
   - Groq : Modèles cloud (mixtral-8x7b-32768, llama2-70b-4096, etc.)

5. Réponse :
   - Ollama : data.response
   - Groq : data.choices[0].message.content

6. Performance :
   - Ollama : Dépend de votre hardware local
   - Groq : Très rapide grâce aux LPU (Language Processing Units)
*/

// ========== Fonction de migration complète ==========

class GroqClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
  }
  
  // Méthode pour convertir un prompt simple en format messages
  promptToMessages(prompt) {
    return [{ role: 'user', content: prompt }];
  }
  
  // Méthode principale pour envoyer des requêtes
  async complete(prompt, options = {}) {
    const messages = typeof prompt === 'string' 
      ? this.promptToMessages(prompt)
      : prompt;
    
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'mixtral-8x7b-32768',
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2048,
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Utilisation de la classe
const groqClient = new GroqClient(GROQ_API_KEY);

// Exemple d'utilisation simple (similaire à Ollama)
async function exempleSimple() {
  const response = await groqClient.complete("Qu'est-ce que Node.js?");
  console.log(response);
}

// Exemple avec options
async function exempleAvecOptions() {
  const response = await groqClient.complete(
    "Écris une fonction JavaScript pour calculer la factorielle",
    {
      model: 'llama3-70b-8192',
      temperature: 0.5,
      max_tokens: 500
    }
  );
  console.log(response);
}

// Export pour utilisation dans d'autres fichiers
module.exports = { GroqClient };