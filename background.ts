// FICHIER: background.ts
interface CorrectionRequest {
  word: string;
  leftContext: string;
  rightContext: string;
  tabId: number;
  inputId: string;
}

interface CorrectionResponse {
  correctedWord: string;
  originalWord: string;
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
async function callOllama(word: string, leftContext: string, rightContext: string): Promise<string> {
  const system = "Tu es un correcteur d'orthographe et grammaire en français. Corrige uniquement le mot fourni. Rends UNIQUEMENT le mot corrigé, sans guillemets, sans explications, ne change pas la casse inutilement.";
  
  const prompt = `Corrige uniquement le mot fourni dans son contexte en français.
Contexte gauche: "${leftContext}"
Mot: "${word}"
Contexte droit: "${rightContext}"
Réponds uniquement par le mot corrigé ou par le même mot si déjà correct.`;

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
        details = 'L\'accès à Ollama est refusé. Vérifiez la configuration CORS ou les paramètres de sécurité.';
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
            details: 'L\'accès à l\'API Ollama est refusé. Vérifiez les paramètres CORS.'
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
    'Access forbidden (403)': 'L\'accès à Ollama est refusé. Vérifiez la configuration CORS ou les paramètres de sécurité.',
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
    
    callOllama(correctionRequest.word, correctionRequest.leftContext, correctionRequest.rightContext)
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