// Background script pour l'extension Chrome avec l'API Groq

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Fonction pour obtenir la clé API depuis le storage
async function getApiKey() {
  const result = await chrome.storage.local.get(['groqApiKey']);
  return result.groqApiKey;
}

// Fonction pour sauvegarder la clé API
async function saveApiKey(apiKey) {
  await chrome.storage.local.set({ groqApiKey: apiKey });
}

// Fonction principale pour envoyer une requête à l'API Groq
async function sendToGroq(messages, model = 'mixtral-8x7b-32768') {
  try {
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      throw new Error('API key not configured. Please set your Groq API key in the extension settings.');
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
}

// Écouteur de messages depuis le popup ou content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendToGroq') {
    sendToGroq(request.messages, request.model)
      .then(response => sendResponse({ success: true, response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indique que la réponse sera asynchrone
  }
  
  if (request.action === 'saveApiKey') {
    saveApiKey(request.apiKey)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'getApiKey') {
    getApiKey()
      .then(apiKey => sendResponse({ success: true, apiKey }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Liste des modèles disponibles sur Groq
const GROQ_MODELS = {
  'mixtral-8x7b-32768': 'Mixtral 8x7B',
  'llama2-70b-4096': 'LLaMA2 70B',
  'gemma-7b-it': 'Gemma 7B',
  'llama3-70b-8192': 'LLaMA3 70B',
  'llama3-8b-8192': 'LLaMA3 8B'
};

// Fonction pour obtenir la liste des modèles
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getModels') {
    sendResponse({ models: GROQ_MODELS });
  }
});