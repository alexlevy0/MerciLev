// Script principal pour le popup de l'extension

let messages = [];

// Éléments DOM
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyButton = document.getElementById('saveApiKey');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const modelSelect = document.getElementById('modelSelect');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const loadingIndicator = document.getElementById('loadingIndicator');

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  await checkApiKey();
  loadChatHistory();
  
  // Event listeners
  saveApiKeyButton.addEventListener('click', saveApiKey);
  sendButton.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});

// Vérifier si une clé API est configurée
async function checkApiKey() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getApiKey' });
    if (response.success && response.apiKey) {
      apiKeyInput.value = response.apiKey;
      apiKeyStatus.textContent = 'Clé API configurée';
      apiKeyStatus.className = 'status-message success';
      return true;
    } else {
      apiKeyStatus.textContent = 'Veuillez configurer votre clé API Groq';
      apiKeyStatus.className = 'status-message warning';
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de la clé API:', error);
    return false;
  }
}

// Sauvegarder la clé API
async function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    apiKeyStatus.textContent = 'Veuillez entrer une clé API valide';
    apiKeyStatus.className = 'status-message error';
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'saveApiKey', 
      apiKey: apiKey 
    });
    
    if (response.success) {
      apiKeyStatus.textContent = 'Clé API sauvegardée avec succès';
      apiKeyStatus.className = 'status-message success';
    } else {
      apiKeyStatus.textContent = 'Erreur lors de la sauvegarde: ' + response.error;
      apiKeyStatus.className = 'status-message error';
    }
  } catch (error) {
    apiKeyStatus.textContent = 'Erreur: ' + error.message;
    apiKeyStatus.className = 'status-message error';
  }
}

// Ajouter un message au chat
function addMessageToChat(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const roleLabel = document.createElement('div');
  roleLabel.className = 'message-role';
  roleLabel.textContent = role === 'user' ? 'Vous' : 'Groq AI';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(roleLabel);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // Faire défiler vers le bas
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Envoyer un message
async function sendMessage() {
  const message = messageInput.value.trim();
  
  if (!message) return;
  
  // Vérifier la clé API
  const hasApiKey = await checkApiKey();
  if (!hasApiKey) {
    apiKeyStatus.textContent = 'Veuillez d\'abord configurer votre clé API';
    apiKeyStatus.className = 'status-message error';
    return;
  }
  
  // Ajouter le message de l'utilisateur
  messages.push({ role: 'user', content: message });
  addMessageToChat('user', message);
  
  // Réinitialiser l'input
  messageInput.value = '';
  
  // Afficher l'indicateur de chargement
  loadingIndicator.style.display = 'flex';
  sendButton.disabled = true;
  
  try {
    // Envoyer la requête au background script
    const response = await chrome.runtime.sendMessage({
      action: 'sendToGroq',
      messages: messages,
      model: modelSelect.value
    });
    
    if (response.success) {
      // Ajouter la réponse de l'assistant
      messages.push({ role: 'assistant', content: response.response });
      addMessageToChat('assistant', response.response);
      
      // Sauvegarder l'historique
      saveChatHistory();
    } else {
      addMessageToChat('system', 'Erreur: ' + response.error);
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    addMessageToChat('system', 'Erreur de connexion: ' + error.message);
  } finally {
    // Cacher l'indicateur de chargement
    loadingIndicator.style.display = 'none';
    sendButton.disabled = false;
  }
}

// Sauvegarder l'historique du chat
function saveChatHistory() {
  chrome.storage.local.set({ chatHistory: messages });
}

// Charger l'historique du chat
async function loadChatHistory() {
  try {
    const result = await chrome.storage.local.get(['chatHistory']);
    if (result.chatHistory) {
      messages = result.chatHistory;
      
      // Afficher les messages existants
      messages.forEach(msg => {
        if (msg.role !== 'system') {
          addMessageToChat(msg.role, msg.content);
        }
      });
    }
  } catch (error) {
    console.error('Erreur lors du chargement de l\'historique:', error);
  }
}

// Fonction pour effacer l'historique (optionnel)
function clearChat() {
  messages = [];
  chatMessages.innerHTML = '';
  chrome.storage.local.remove(['chatHistory']);
}