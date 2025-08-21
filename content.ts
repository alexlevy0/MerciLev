// FICHIER: content.ts
interface InputOverlay {
  input: HTMLInputElement | HTMLTextAreaElement;
  overlay: HTMLDivElement;
  correctedWords: Set<string>;
}

// Map des overlays pour chaque input
const overlays = new Map<HTMLInputElement | HTMLTextAreaElement, InputOverlay>();

// Création de l'overlay miroir
function createOverlay(input: HTMLInputElement | HTMLTextAreaElement): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'correction-overlay';
  
  // Style de base pour l'overlay
  const computedStyle = window.getComputedStyle(input);
  overlay.style.cssText = `
    position: absolute;
    pointer-events: none;
    white-space: pre-wrap;
    overflow: hidden;
    color: transparent;
    background: transparent;
    font-family: ${computedStyle.fontFamily};
    font-size: ${computedStyle.fontSize};
    font-weight: ${computedStyle.fontWeight};
    line-height: ${computedStyle.lineHeight};
    letter-spacing: ${computedStyle.letterSpacing};
    text-align: ${computedStyle.textAlign};
    padding: ${computedStyle.padding};
    border: ${computedStyle.borderWidth} solid transparent;
    box-sizing: ${computedStyle.boxSizing};
    z-index: 10000;
  `;
  
  // Positionnement de l'overlay
  updateOverlayPosition(input, overlay);
  
  // Insertion dans le DOM
  input.parentElement?.appendChild(overlay);
  
  return overlay;
}

// Mise à jour de la position de l'overlay
function updateOverlayPosition(input: HTMLInputElement | HTMLTextAreaElement, overlay: HTMLDivElement) {
  const rect = input.getBoundingClientRect();
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

// Mise à jour du contenu de l'overlay
function updateOverlayContent(overlay: HTMLDivElement, text: string, correctedWords: Set<string>) {
  const words = text.split(/(\s+)/);
  let html = '';
  
  for (const word of words) {
    if (correctedWords.has(word.trim()) && word.trim() !== '') {
      html += `<span style="text-decoration: underline; text-decoration-color: #16a34a; text-decoration-thickness: 2px;">${escapeHtml(word)}</span>`;
    } else {
      html += escapeHtml(word);
    }
  }
  
  overlay.innerHTML = html;
}

// Échapper le HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Afficher une infobulle d'erreur
function showErrorTooltip(input: HTMLInputElement | HTMLTextAreaElement, error: string) {
  // Supprimer l'ancienne infobulle si elle existe
  const existingTooltip = document.querySelector('.correction-error-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
  // Traduire les messages d'erreur en français
  const errorMessages: Record<string, string> = {
    'Ollama unreachable': 'Ollama inaccessible',
    'Model not found': 'Modèle introuvable',
    'Access forbidden (403)': 'Accès refusé (403)',
    'Authentication required (401)': 'Authentification requise',
    'Ollama server error (500)': 'Erreur serveur Ollama',
    'Bad gateway (502)': 'Passerelle incorrecte',
    'Service unavailable (503)': 'Service indisponible'
  };
  
  const displayError = errorMessages[error] || error;
  
  const tooltip = document.createElement('div');
  tooltip.className = 'correction-error-tooltip';
  tooltip.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 2px;">Erreur de correction</div>
    <div>${displayError}</div>
  `;
  tooltip.style.cssText = `
    position: absolute;
    background: #dc2626;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 10001;
    pointer-events: none;
    animation: fadeIn 0.2s ease-in;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    max-width: 250px;
    line-height: 1.4;
  `;
  
  const rect = input.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.bottom + window.scrollY + 4}px`;
  
  // Ajuster la position si l'infobulle sort de l'écran
  document.body.appendChild(tooltip);
  const tooltipRect = tooltip.getBoundingClientRect();
  
  if (tooltipRect.right > window.innerWidth) {
    tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
  }
  
  if (tooltipRect.bottom > window.innerHeight) {
    tooltip.style.top = `${rect.top + window.scrollY - tooltipRect.height - 4}px`;
  }
  
  // Supprimer après 5 secondes
  setTimeout(() => {
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => tooltip.remove(), 300);
  }, 5000);
}

// Gérer la détection d'espace et la correction
async function handleSpacePress(input: HTMLInputElement | HTMLTextAreaElement) {
  const caretPos = input.selectionStart;
  const text = input.value;
  
  // Vérifier que le caret est à la fin et qu'il n'y a pas de sélection
  if (caretPos !== input.selectionEnd || caretPos === null) {
    return;
  }
  
  // Trouver le mot précédent l'espace
  const beforeCaret = text.substring(0, caretPos);
  const words = beforeCaret.match(/\S+/g);
  
  if (!words || words.length === 0) {
    return;
  }
  
  const lastWord = words[words.length - 1];
  const wordStartIndex = beforeCaret.lastIndexOf(lastWord);
  
  // Extraire le contexte (80 caractères de chaque côté)
  const contextStart = Math.max(0, wordStartIndex - 80);
  const contextEnd = Math.min(text.length, caretPos + 80);
  const leftContext = text.substring(contextStart, wordStartIndex).trim();
  const rightContext = text.substring(caretPos, contextEnd).trim();
  
  // Envoyer la requête de correction
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'correct-word',
      word: lastWord,
      leftContext: leftContext,
      rightContext: rightContext,
      tabId: chrome.runtime.id,
      inputId: input.id || 'unknown'
    });
    
    if (response.error) {
      showErrorTooltip(input, response.error);
      return;
    }
    
    if (response.correctedWord !== lastWord) {
      // Remplacer le mot
      const newText = text.substring(0, wordStartIndex) + response.correctedWord + text.substring(wordStartIndex + lastWord.length);
      input.value = newText;
      
      // Repositionner le caret après l'espace
      const newCaretPos = wordStartIndex + response.correctedWord.length + (caretPos - (wordStartIndex + lastWord.length));
      input.setSelectionRange(newCaretPos, newCaretPos);
      
      // Ajouter le mot corrigé à la liste
      const overlayData = overlays.get(input);
      if (overlayData) {
        overlayData.correctedWords.add(response.correctedWord);
        updateOverlayContent(overlayData.overlay, newText, overlayData.correctedWords);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la correction:', error);
  }
}

// Observer un input/textarea
function observeInput(input: HTMLInputElement | HTMLTextAreaElement) {
  // Vérifier si déjà observé
  if (overlays.has(input)) {
    return;
  }
  
  // Créer l'overlay
  const overlay = createOverlay(input);
  const correctedWords = new Set<string>();
  overlays.set(input, { input, overlay, correctedWords });
  
  // Gestionnaire d'événements
  let lastValue = input.value;
  
  input.addEventListener('input', (event) => {
    const newValue = input.value;
    updateOverlayContent(overlay, newValue, correctedWords);
    
    // Détecter si un espace a été ajouté
    if (newValue.length > lastValue.length && newValue[input.selectionStart! - 1] === ' ') {
      handleSpacePress(input);
    }
    
    lastValue = newValue;
  });
  
  // Mettre à jour la position lors du scroll ou resize
  const updatePosition = () => updateOverlayPosition(input, overlay);
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition, { passive: true });
  
  // Observer les changements de style de l'input
  const resizeObserver = new ResizeObserver(() => updatePosition());
  resizeObserver.observe(input);
}

// Observer tous les inputs et textareas existants
function observeAllInputs() {
  const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input:not([type]), textarea');
  inputs.forEach(input => observeInput(input as HTMLInputElement | HTMLTextAreaElement));
}

// Observer les nouveaux éléments ajoutés au DOM
const mutationObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.matches('input[type="text"], input[type="search"], input[type="email"], input:not([type]), textarea')) {
            observeInput(element as HTMLInputElement | HTMLTextAreaElement);
          }
          // Chercher dans les enfants
          const inputs = element.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input:not([type]), textarea');
          inputs.forEach(input => observeInput(input as HTMLInputElement | HTMLTextAreaElement));
        }
      });
    }
  }
});

// Ajouter les styles CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .correction-error-tooltip {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
`;
document.head.appendChild(style);

// Démarrer l'observation
observeAllInputs();
mutationObserver.observe(document.body, {
  childList: true,
  subtree: true
});