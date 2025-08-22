// content-safe.ts - Version optimisée pour éviter les crashes

// Domaines à exclure pour éviter les conflits
const EXCLUDED_DOMAINS = [
  'slack.com',
  'discord.com',
  'facebook.com',
  'messenger.com',
  'teams.microsoft.com',
  'notion.so',
  'figma.com',
  'canva.com',
  'docs.google.com',
  'sheets.google.com',
  'mail.google.com',
  'outlook.office.com',
  'outlook.live.com'
];

// Vérifier si on est sur un domaine exclu
function isExcludedDomain(): boolean {
  const hostname = window.location.hostname;
  return EXCLUDED_DOMAINS.some(domain => hostname.includes(domain));
}

// Limiter le nombre d'éléments observés
const MAX_OBSERVED_ELEMENTS = 50;
let observedCount = 0;

// Garder une référence globale du MutationObserver pour pouvoir le déconnecter
let globalMutationObserver: MutationObserver | null = null;

// Fonction principale
function initializeSafely() {
  // Ne pas s'exécuter sur les domaines exclus
  if (isExcludedDomain()) {
    console.log('Ollama Corrector: Site exclu, extension désactivée');
    return;
  }

  // Vérifier la performance avant de continuer
  if (performance.memory && performance.memory.usedJSHeapSize > 100 * 1024 * 1024) {
    console.log('Ollama Corrector: Mémoire élevée détectée, limitation de l\'observation');
  }

  // Importer le script principal avec des protections
  import('./content.js').then(() => {
    console.log('Ollama Corrector: Chargé avec succès');
    
    // Ajouter des protections supplémentaires
    addSafetyMeasures();
  }).catch(error => {
    console.error('Ollama Corrector: Erreur de chargement', error);
  });
}

// Mesures de sécurité supplémentaires
function addSafetyMeasures() {
  // Limiter les observations
  const originalObserve = window.MutationObserver.prototype.observe;
  let observerCount = 0;
  
  window.MutationObserver.prototype.observe = function(...args) {
    observerCount++;
    if (observerCount > 10) {
      console.warn('Ollama Corrector: Trop de MutationObservers, arrêt');
      return;
    }
    return originalObserve.apply(this, args);
  };

  // Détecter les ralentissements
  let lastCheck = performance.now();
  const performanceChecker = setInterval(() => {
    const now = performance.now();
    const delta = now - lastCheck;
    
    if (delta > 1000) {
      console.error('Ollama Corrector: Ralentissement détecté, désactivation');
      cleanup();
      clearInterval(performanceChecker);
    }
    
    lastCheck = now;
  }, 500);

  // Nettoyer en cas de problème
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('ollama')) {
      console.error('Ollama Corrector: Erreur détectée, nettoyage');
      cleanup();
    }
  });
}

// Fonction de nettoyage globale
function cleanup() {
  // Déconnecter tous les observers
  if (globalMutationObserver) {
    globalMutationObserver.disconnect();
    globalMutationObserver = null;
  }

  // Supprimer tous les éléments créés
  const elements = document.querySelectorAll('.ollama-status, .ollama-overlay');
  elements.forEach(el => el.remove());

  // Nettoyer les intervalles
  const highestId = window.setTimeout(() => {}, 0);
  for (let i = 0; i < highestId; i++) {
    window.clearTimeout(i);
    window.clearInterval(i);
  }

  console.log('Ollama Corrector: Nettoyage complet');
}

// Démarrer avec des protections
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSafely);
} else {
  initializeSafely();
}