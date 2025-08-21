// FICHIER: popup.ts
const statusDiv = document.getElementById('status')!;
const statusText = document.getElementById('statusText')!;
const errorDetails = document.getElementById('errorDetails')!;
const testButton = document.getElementById('testButton')! as HTMLButtonElement;

// Fonction pour mettre à jour l'affichage du statut
function updateStatus(status: string, hasError: boolean, details?: string) {
  statusText.textContent = getStatusText(status);
  
  if (hasError) {
    statusDiv.classList.remove('ok');
    statusDiv.classList.add('error');
    
    if (status !== 'OK') {
      errorDetails.textContent = getErrorDescription(status, details);
      errorDetails.style.display = 'block';
    } else {
      errorDetails.style.display = 'none';
    }
  } else {
    statusDiv.classList.remove('error');
    statusDiv.classList.add('ok');
    errorDetails.style.display = 'none';
  }
}

// Traduction des statuts
function getStatusText(status: string): string {
  switch (status) {
    case 'OK':
      return '✓ Connexion OK';
    case 'Ollama unreachable':
      return '✗ Ollama inaccessible';
    case 'Model not found':
      return '✗ Modèle introuvable';
    case 'Access forbidden (403)':
      return '✗ Accès refusé (403)';
    case 'Authentication required (401)':
      return '✗ Authentification requise (401)';
    case 'Ollama server error (500)':
      return '✗ Erreur serveur (500)';
    case 'Bad gateway (502)':
      return '✗ Passerelle incorrecte (502)';
    case 'Service unavailable (503)':
      return '✗ Service indisponible (503)';
    default:
      if (status.startsWith('HTTP')) {
        return `✗ Erreur ${status}`;
      }
      return '✗ Erreur';
  }
}

// Description détaillée des erreurs
function getErrorDescription(status: string, details?: string): string {
  if (details) {
    return details;
  }
  
  switch (status) {
    case 'Ollama unreachable':
      return 'Vérifiez qu\'Ollama est bien démarré sur votre machine (ollama serve).';
    case 'Model not found':
      return 'Le modèle gemma3n:e4b n\'est pas installé. Exécutez : ollama pull gemma3n:e4b';
    case 'Access forbidden (403)':
      return 'L\'accès à Ollama est refusé. Vérifiez la configuration CORS ou les paramètres de sécurité.';
    case 'Authentication required (401)':
      return 'Une authentification est requise pour accéder à Ollama.';
    case 'Ollama server error (500)':
      return 'Le serveur Ollama a rencontré une erreur interne.';
    case 'Bad gateway (502)':
      return 'Problème de communication avec le serveur Ollama.';
    case 'Service unavailable (503)':
      return 'Le service Ollama est temporairement indisponible. Réessayez plus tard.';
    default:
      if (status.startsWith('HTTP')) {
        return `Erreur serveur avec le code ${status.replace('HTTP ', '')}`;
      }
      return status;
  }
}

// Charger le statut initial
async function loadStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get-status' });
    updateStatus(response.status, response.hasError, response.details);
  } catch (error) {
    updateStatus('Erreur de communication', true, 'Impossible de communiquer avec l\'extension.');
  }
}

// Test de connexion
async function testConnection() {
  testButton.disabled = true;
  testButton.textContent = 'Test en cours...';
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'test-connection' });
    
    if (response.success) {
      updateStatus('OK', false);
    } else {
      updateStatus(response.error || 'Erreur inconnue', true, response.details);
    }
  } catch (error) {
    updateStatus('Erreur de communication', true, 'Impossible de communiquer avec l\'extension.');
  } finally {
    testButton.disabled = false;
    testButton.textContent = 'Tester connexion';
  }
}

// Gestionnaires d'événements
testButton.addEventListener('click', testConnection);

// Charger le statut au démarrage
loadStatus();

// Rafraîchir le statut toutes les 2 secondes
setInterval(loadStatus, 2000);