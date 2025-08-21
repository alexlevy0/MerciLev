// FICHIER: popup.ts
const statusDiv = document.getElementById('status')!;
const statusText = document.getElementById('statusText')!;
const errorDetails = document.getElementById('errorDetails')!;
const testButton = document.getElementById('testButton')! as HTMLButtonElement;

// Fonction pour mettre à jour l'affichage du statut
function updateStatus(status: string, hasError: boolean) {
  statusText.textContent = getStatusText(status);
  
  if (hasError) {
    statusDiv.classList.remove('ok');
    statusDiv.classList.add('error');
    
    if (status !== 'OK') {
      errorDetails.textContent = getErrorDescription(status);
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
    default:
      return '✗ Erreur';
  }
}

// Description détaillée des erreurs
function getErrorDescription(status: string): string {
  switch (status) {
    case 'Ollama unreachable':
      return 'Vérifiez qu\'Ollama est bien démarré sur votre machine (ollama serve).';
    case 'Model not found':
      return 'Le modèle gemma3n:e4b n\'est pas installé. Exécutez : ollama pull gemma3n:e4b';
    default:
      return status;
  }
}

// Charger le statut initial
async function loadStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'get-status' });
    updateStatus(response.status, response.hasError);
  } catch (error) {
    updateStatus('Erreur de communication', true);
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
      updateStatus(response.error || 'Erreur inconnue', true);
    }
  } catch (error) {
    updateStatus('Erreur de communication', true);
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