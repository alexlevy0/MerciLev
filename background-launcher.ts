// background-launcher.ts - Module pour démarrer Ollama automatiquement

interface OllamaStatus {
  running: boolean;
  error?: string;
  port: number;
}

class OllamaLauncher {
  private status: OllamaStatus = {
    running: false,
    port: 11434
  };
  
  private checkInterval: NodeJS.Timeout | null = null;
  private startAttempts = 0;
  private maxAttempts = 3;

  constructor() {
    this.checkOllamaStatus();
    this.setupAutoStart();
  }

  // Vérifier si Ollama est en cours d'exécution
  async checkOllamaStatus(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.status.port}/api/version`);
      if (response.ok) {
        this.status.running = true;
        this.status.error = undefined;
        return true;
      }
    } catch (error) {
      this.status.running = false;
    }
    return false;
  }

  // Configuration pour le démarrage automatique
  private setupAutoStart() {
    // Vérifier toutes les 5 secondes
    this.checkInterval = setInterval(async () => {
      const isRunning = await this.checkOllamaStatus();
      
      if (!isRunning && this.startAttempts < this.maxAttempts) {
        console.log('Ollama non détecté, tentative de démarrage...');
        await this.tryStartOllama();
      }
    }, 5000);
  }

  // Tenter de démarrer Ollama via Native Messaging
  private async tryStartOllama() {
    this.startAttempts++;
    
    // Envoyer une notification à l'utilisateur
    chrome.notifications.create('ollama-start', {
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Correcteur Français',
      message: 'Tentative de démarrage d\'Ollama...',
      priority: 1
    });

    // Essayer de lancer via un script système
    try {
      // Sur Windows, essayer via PowerShell
      if (navigator.userAgent.includes('Windows')) {
        await this.launchViaProtocol('ollama://start');
      }
      
      // Attendre un peu et vérifier
      setTimeout(async () => {
        const isRunning = await this.checkOllamaStatus();
        if (isRunning) {
          chrome.notifications.create('ollama-success', {
            type: 'basic',
            iconUrl: 'icon.png',
            title: 'Correcteur Français',
            message: 'Ollama démarré avec succès !',
            priority: 1
          });
        } else {
          this.showManualInstructions();
        }
      }, 3000);
    } catch (error) {
      this.showManualInstructions();
    }
  }

  // Lancer via un protocole custom (nécessite configuration)
  private async launchViaProtocol(url: string) {
    // Créer un onglet temporaire pour déclencher le protocole
    const tab = await chrome.tabs.create({
      url: url,
      active: false
    });
    
    // Fermer l'onglet après 1 seconde
    setTimeout(() => {
      chrome.tabs.remove(tab.id!);
    }, 1000);
  }

  // Afficher les instructions manuelles
  private showManualInstructions() {
    chrome.notifications.create('ollama-manual', {
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Action requise',
      message: 'Veuillez lancer Ollama manuellement : ollama serve',
      priority: 2,
      buttons: [
        { title: 'Instructions' }
      ]
    });

    // Ouvrir la page d'aide si l'utilisateur clique
    chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
      if (notifId === 'ollama-manual' && btnIdx === 0) {
        chrome.tabs.create({
          url: 'help.html'
        });
      }
    });
  }

  // Obtenir le statut actuel
  getStatus(): OllamaStatus {
    return this.status;
  }

  // Nettoyer les ressources
  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Exporter une instance unique
export const ollamaLauncher = new OllamaLauncher();

// Intégration avec le background script existant
export function setupOllamaAutoStart() {
  // Écouter les messages de status
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'get-ollama-status') {
      sendResponse(ollamaLauncher.getStatus());
      return true;
    }
    
    if (request.type === 'start-ollama') {
      ollamaLauncher.tryStartOllama();
      sendResponse({ success: true });
      return true;
    }
  });

  // Nettoyer à la fermeture
  chrome.runtime.onSuspend.addListener(() => {
    ollamaLauncher.cleanup();
  });
}

// Script d'enregistrement du protocole (à exécuter une fois)
export const PROTOCOL_REGISTRATION_SCRIPT = `
# Windows - Enregistrer le protocole ollama://
# Sauvegarder comme register-ollama-protocol.reg et exécuter

Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\\ollama]
@="URL:Ollama Protocol"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\\ollama\\shell]

[HKEY_CLASSES_ROOT\\ollama\\shell\\open]

[HKEY_CLASSES_ROOT\\ollama\\shell\\open\\command]
@="powershell.exe -WindowStyle Hidden -Command \\"Start-Process 'ollama' -ArgumentList 'serve' -WindowStyle Hidden\\""
`;