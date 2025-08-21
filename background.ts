// FICHIER: background.ts
interface CorrectionRequest {
  word: string;
  fullText: string;
  sentence: string;
  position: number;
  tabId: number;
  inputId: string;
}

interface CorrectionResponse {
  correctedWord: string;
  originalWord: string;
  error?: string;
}

interface CompletionRequest {
  partialWord: string;
  fullText: string;
  position: number;
}

interface CompletionResponse {
  suggestions: string[];
  error?: string;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'gemma3n:e4b';

// État de l'extension
let lastError: string | null = null;

// Fonction pour appeler Ollama
async function callOllama(word: string, fullText: string, sentence: string, position: number): Promise<string> {
  const system = `Tu es un correcteur orthographique et grammatical expert en français. 
RÈGLES STRICTES:
1. Retourne UNIQUEMENT le mot ou groupe de mots corrigé, SANS guillemets ni explications
2. La correction doit être PROCHE de l'original (même racine, même champ lexical)
3. Ne jamais remplacer par un mot complètement différent (ex: "tio" ne peut pas devenir "Alexandre")
4. Respecte la casse originale sauf si c'est une erreur
5. Tu peux corriger plusieurs mots adjacents si nécessaire pour la grammaire
6. Privilégie les corrections minimales et logiques dans le contexte`;
  
  const prompt = `Contexte complet du texte:
"${fullText}"

Phrase actuelle:
"${sentence}"

Mot ou expression à corriger (position ${position}):
"${word}"

Corrige UNIQUEMENT cette partie en respectant le sens et la proximité avec l'original.`;

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        system: system,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { error: errorText };
      }
      
      // Détection d'erreurs spécifiques
      if (response.status === 404 || errorJson.error?.includes('model') || errorJson.error?.includes('not found')) {
        throw new Error('Model not found');
      }
      if (response.status === 403) {
        throw new Error('Access forbidden (403)');
      }
      if (response.status === 401) {
        throw new Error('Authentication required (401)');
      }
      if (response.status === 500) {
        throw new Error('Ollama server error (500)');
      }
      if (response.status === 502) {
        throw new Error('Bad gateway (502)');
      }
      if (response.status === 503) {
        throw new Error('Service unavailable (503)');
      }
      throw new Error(`HTTP ${response.status}: ${errorJson.error || errorText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response.trim();
  } catch (error: any) {
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      throw new Error('Ollama unreachable');
    }
    throw error;
  }
}

// Fonction pour obtenir des suggestions d'autocomplétion
async function getCompletions(partialWord: string, fullText: string, position: number): Promise<string[]> {
  const system = `Tu es un assistant d'autocomplétion en français.
RÈGLES:
1. Propose 3 à 5 complétions possibles pour le mot commencé
2. Retourne UNIQUEMENT une liste de mots séparés par des virgules
3. Les suggestions doivent être pertinentes dans le contexte
4. Priorise les mots courants et bien orthographiés
5. Format: mot1, mot2, mot3`;
  
  const prompt = `Contexte: "${fullText}"
Mot à compléter: "${partialWord}"
Position: ${position}

Propose des complétions pertinentes pour ce mot partiel.`;

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        system: system,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: OllamaResponse = await response.json();
    const suggestions = data.response.trim()
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.startsWith(partialWord))
      .slice(0, 5);
    
    return suggestions;
  } catch (error: any) {
    console.error('Completion error:', error);
    return [];
  }
}

// Test de connexion à Ollama
async function testConnection(): Promise<{ success: boolean; error?: string; details?: string }> {
  try {
    // Test de base de connexion à Ollama
    const response = await fetch('http://localhost:11434/', {
      method: 'GET'
    });
    
    if (!response.ok) {
      let error = 'Ollama error';
      let details = '';
      
      if (response.status === 403) {
        error = 'Access forbidden (403)';
        details = 'Ollama bloque les requêtes de l\'extension. Redémarrez Ollama avec : OLLAMA_ORIGINS="*" ollama serve';
      } else if (response.status === 404) {
        error = 'Endpoint not found (404)';
        details = 'L\'endpoint Ollama n\'est pas trouvé. Vérifiez que le service est bien démarré.';
      } else {
        error = `HTTP ${response.status}`;
        details = `Erreur serveur avec le code ${response.status}`;
      }
      
      lastError = error;
      await updateBadge(true);
      return { success: false, error, details };
    }
    
    // Test si le modèle est disponible
    try {
      const testResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          prompt: 'test',
          stream: false
        })
      });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        let errorJson: any;
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          errorJson = { error: errorText };
        }
        
        if (testResponse.status === 404 || errorJson.error?.includes('model') || errorJson.error?.includes('not found')) {
          lastError = 'Model not found';
          await updateBadge(true);
          return { 
            success: false, 
            error: 'Model not found',
            details: `Le modèle ${MODEL_NAME} n'est pas installé. Exécutez : ollama pull ${MODEL_NAME}`
          };
        }
        
        if (testResponse.status === 403) {
          lastError = 'Access forbidden (403)';
          await updateBadge(true);
          return { 
            success: false, 
            error: 'Access forbidden (403)',
            details: 'Ollama bloque les requêtes de l\'extension. Redémarrez Ollama avec : OLLAMA_ORIGINS="*" ollama serve'
          };
        }
      }
    } catch (e) {
      // Ignorer les erreurs du test de modèle
    }
    
    lastError = null;
    await updateBadge(false);
    return { success: true };
  } catch (e: any) {
    const error = 'Ollama unreachable';
    const details = 'Impossible de se connecter à Ollama. Assurez-vous qu\'il est démarré avec : ollama serve';
    lastError = error;
    await updateBadge(true);
    return { success: false, error, details };
  }
}

// Mise à jour du badge de l'icône
async function updateBadge(hasError: boolean) {
  if (hasError) {
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

// Obtenir les détails de l'erreur
function getErrorDetails(error: string | null): string {
  if (!error) return '';
  
  const errorDetails: Record<string, string> = {
    'Ollama unreachable': 'Impossible de se connecter à Ollama. Assurez-vous qu\'il est démarré avec : ollama serve',
    'Model not found': `Le modèle ${MODEL_NAME} n'est pas installé. Exécutez : ollama pull ${MODEL_NAME}`,
    'Access forbidden (403)': 'Ollama bloque les requêtes de l\'extension. Redémarrez Ollama avec : OLLAMA_ORIGINS="*" ollama serve',
    'Authentication required (401)': 'Authentification requise pour accéder à Ollama.',
    'Ollama server error (500)': 'Erreur interne du serveur Ollama.',
    'Bad gateway (502)': 'Problème de passerelle avec Ollama.',
    'Service unavailable (503)': 'Le service Ollama est temporairement indisponible.'
  };
  
  return errorDetails[error] || error;
}

// Gestionnaire de messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'correct-word') {
    const correctionRequest = request as CorrectionRequest & { type: string };
    
    callOllama(
      correctionRequest.word, 
      correctionRequest.fullText, 
      correctionRequest.sentence, 
      correctionRequest.position
    )
      .then(correctedWord => {
        lastError = null;
        updateBadge(false);
        sendResponse({
          correctedWord,
          originalWord: correctionRequest.word
        } as CorrectionResponse);
      })
      .catch(error => {
        lastError = error.message;
        updateBadge(true);
        sendResponse({
          correctedWord: correctionRequest.word,
          originalWord: correctionRequest.word,
          error: error.message
        } as CorrectionResponse);
      });
    
    return true; // Indique que la réponse sera asynchrone
  }
  
  if (request.type === 'get-status') {
    sendResponse({
      status: lastError || 'OK',
      hasError: !!lastError,
      details: getErrorDetails(lastError)
    });
    return false;
  }
  
  if (request.type === 'test-connection') {
    testConnection().then(result => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.type === 'get-completions') {
    const completionRequest = request as CompletionRequest & { type: string };
    
    getCompletions(
      completionRequest.partialWord,
      completionRequest.fullText,
      completionRequest.position
    )
      .then(suggestions => {
        sendResponse({
          suggestions,
          error: undefined
        } as CompletionResponse);
      })
      .catch(error => {
        sendResponse({
          suggestions: [],
          error: error.message
        } as CompletionResponse);
      });
    
    return true;
  }
  
  return false;
});

// Test initial de connexion au démarrage
chrome.runtime.onInstalled.addListener(() => {
  testConnection();
});

// Test périodique toutes les 30 secondes
setInterval(() => {
  testConnection();
}, 30000);