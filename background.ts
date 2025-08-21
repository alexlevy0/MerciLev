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
async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('http://localhost:11434/', {
      method: 'GET'
    });
    
    if (response.ok) {
      lastError = null;
      await updateBadge(false);
      return { success: true };
    } else {
      const error = 'Ollama unreachable';
      lastError = error;
      await updateBadge(true);
      return { success: false, error };
    }
  } catch {
    const error = 'Ollama unreachable';
    lastError = error;
    await updateBadge(true);
    return { success: false, error };
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
      hasError: !!lastError
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