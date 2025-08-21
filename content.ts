// FICHIER: content.ts
interface InputState {
  input: HTMLInputElement | HTMLTextAreaElement;
  overlay: HTMLDivElement;
  completionBox: HTMLDivElement | null;
  correctedWords: Map<number, {word: string, originalWord: string}>;
  lastValue: string;
  isComposing: boolean;
  selectedCompletionIndex: number;
  currentCompletions: string[];
  partialWord: string;
  partialWordStart: number;
}

// Map des états pour chaque input
const inputStates = new Map<HTMLInputElement | HTMLTextAreaElement, InputState>();

// Extraire la phrase actuelle autour de la position du curseur
function getCurrentSentence(text: string, position: number): string {
  // Trouver le début de la phrase
  let start = position;
  while (start > 0 && !'.!?'.includes(text[start - 1])) {
    start--;
  }
  
  // Trouver la fin de la phrase
  let end = position;
  while (end < text.length && !'.!?'.includes(text[end])) {
    end++;
  }
  if (end < text.length) end++; // Inclure la ponctuation
  
  return text.substring(start, end).trim();
}

// Trouver les limites du mot à une position donnée
function getWordBounds(text: string, position: number): {start: number, end: number, word: string} {
  // Si on est sur un espace, prendre le mot précédent
  if (position > 0 && text[position - 1] === ' ') {
    position--;
  }
  
  // Trouver le début du mot
  let start = position;
  while (start > 0 && /[^\s.,!?;:()[\]{}'"«»]/.test(text[start - 1])) {
    start--;
  }
  
  // Trouver la fin du mot
  let end = position;
  while (end < text.length && /[^\s.,!?;:()[\]{}'"«»]/.test(text[end])) {
    end++;
  }
  
  return {
    start,
    end,
    word: text.substring(start, end)
  };
}

// Créer l'overlay miroir
function createOverlay(input: HTMLInputElement | HTMLTextAreaElement): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'correction-overlay';
  
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
  
  updateOverlayPosition(input, overlay);
  input.parentElement?.appendChild(overlay);
  
  return overlay;
}

// Créer la boîte d'autocomplétion
function createCompletionBox(): HTMLDivElement {
  const box = document.createElement('div');
  box.className = 'completion-box';
  box.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    padding: 4px 0;
    z-index: 10001;
    display: none;
    max-width: 300px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  document.body.appendChild(box);
  return box;
}

// Mise à jour de la position de l'overlay
function updateOverlayPosition(input: HTMLInputElement | HTMLTextAreaElement, overlay: HTMLDivElement) {
  const rect = input.getBoundingClientRect();
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

// Mise à jour du contenu de l'overlay avec animations
function updateOverlayContent(state: InputState) {
  const text = state.input.value;
  const words = text.split(/(\s+)/);
  let html = '';
  let charIndex = 0;
  
  for (const word of words) {
    let hasCorrection = false;
    let correctionClass = '';
    
    // Vérifier si ce mot a été corrigé
    for (const [pos, correction] of state.correctedWords) {
      if (charIndex <= pos && pos < charIndex + word.length) {
        hasCorrection = true;
        // Ajouter une classe d'animation si c'est une nouvelle correction
        const isNew = Date.now() - (correction as any).timestamp < 1000;
        correctionClass = isNew ? 'correction-animate' : 'correction-highlight';
        break;
      }
    }
    
    if (hasCorrection && word.trim() !== '') {
      html += `<span class="${correctionClass}">${escapeHtml(word)}</span>`;
    } else {
      html += escapeHtml(word);
    }
    
    charIndex += word.length;
  }
  
  state.overlay.innerHTML = html;
}

// Échapper le HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Afficher une infobulle d'erreur
function showErrorTooltip(input: HTMLInputElement | HTMLTextAreaElement, error: string) {
  const existingTooltip = document.querySelector('.correction-error-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  
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
  
  document.body.appendChild(tooltip);
  const tooltipRect = tooltip.getBoundingClientRect();
  
  if (tooltipRect.right > window.innerWidth) {
    tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
  }
  
  if (tooltipRect.bottom > window.innerHeight) {
    tooltip.style.top = `${rect.top + window.scrollY - tooltipRect.height - 4}px`;
  }
  
  setTimeout(() => {
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => tooltip.remove(), 300);
  }, 5000);
}

// Gérer la correction lors de l'espace
async function handleSpacePress(state: InputState) {
  const input = state.input;
  const caretPos = input.selectionStart;
  
  if (caretPos === null || caretPos !== input.selectionEnd) {
    return;
  }
  
  const text = input.value;
  const sentence = getCurrentSentence(text, caretPos);
  
  // Trouver le mot précédent
  const wordBounds = getWordBounds(text, caretPos - 1);
  
  if (!wordBounds.word) {
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'correct-word',
      word: wordBounds.word,
      fullText: text,
      sentence: sentence,
      position: wordBounds.start,
      tabId: chrome.runtime.id,
      inputId: input.id || 'unknown'
    });
    
    if (response.error) {
      showErrorTooltip(input, response.error);
      return;
    }
    
    if (response.correctedWord !== wordBounds.word) {
      // Remplacer le mot ou groupe de mots
      const correctedWords = response.correctedWord.split(' ');
      const originalWords = wordBounds.word.split(' ');
      
      // Calculer la nouvelle position du texte
      const newText = text.substring(0, wordBounds.start) + 
                     response.correctedWord + 
                     text.substring(wordBounds.end);
      
      input.value = newText;
      
      // Repositionner le caret
      const lengthDiff = response.correctedWord.length - wordBounds.word.length;
      input.setSelectionRange(caretPos + lengthDiff, caretPos + lengthDiff);
      
      // Enregistrer la correction avec timestamp pour l'animation
      state.correctedWords.set(wordBounds.start, {
        word: response.correctedWord,
        originalWord: wordBounds.word,
        timestamp: Date.now()
      } as any);
      
      updateOverlayContent(state);
    }
  } catch (error) {
    console.error('Erreur lors de la correction:', error);
  }
}

// Gérer l'autocomplétion
async function handleAutocompletion(state: InputState) {
  const input = state.input;
  const caretPos = input.selectionStart;
  
  if (!caretPos || state.isComposing) {
    hideCompletionBox(state);
    return;
  }
  
  const text = input.value;
  const wordBounds = getWordBounds(text, caretPos);
  
  if (!wordBounds.word || wordBounds.word.length < 2) {
    hideCompletionBox(state);
    return;
  }
  
  state.partialWord = wordBounds.word;
  state.partialWordStart = wordBounds.start;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'get-completions',
      partialWord: wordBounds.word,
      fullText: text,
      position: wordBounds.start
    });
    
    if (response.suggestions && response.suggestions.length > 0) {
      showCompletionBox(state, response.suggestions, wordBounds.start);
    } else {
      hideCompletionBox(state);
    }
  } catch (error) {
    console.error('Erreur autocomplétion:', error);
    hideCompletionBox(state);
  }
}

// Afficher la boîte de complétion
function showCompletionBox(state: InputState, suggestions: string[], wordStart: number) {
  if (!state.completionBox) {
    state.completionBox = createCompletionBox();
  }
  
  state.currentCompletions = suggestions;
  state.selectedCompletionIndex = 0;
  
  // Créer le contenu HTML
  let html = '';
  suggestions.forEach((suggestion, index) => {
    const isSelected = index === state.selectedCompletionIndex;
    html += `
      <div class="completion-item ${isSelected ? 'selected' : ''}" 
           style="padding: 6px 12px; cursor: pointer; ${isSelected ? 'background: #3b82f6; color: white;' : ''}">
        ${escapeHtml(suggestion)}
      </div>
    `;
  });
  
  state.completionBox.innerHTML = html;
  state.completionBox.style.display = 'block';
  
  // Positionner la boîte
  const rect = state.input.getBoundingClientRect();
  const inputStyle = window.getComputedStyle(state.input);
  const lineHeight = parseFloat(inputStyle.lineHeight);
  
  // Estimation approximative de la position du curseur
  const caretOffset = getCaretCoordinates(state.input, wordStart);
  
  state.completionBox.style.left = `${rect.left + caretOffset.left}px`;
  state.completionBox.style.top = `${rect.top + caretOffset.top + lineHeight}px`;
}

// Cacher la boîte de complétion
function hideCompletionBox(state: InputState) {
  if (state.completionBox) {
    state.completionBox.style.display = 'none';
  }
  state.currentCompletions = [];
  state.selectedCompletionIndex = 0;
}

// Accepter la complétion sélectionnée
function acceptCompletion(state: InputState) {
  if (state.currentCompletions.length === 0) return;
  
  const completion = state.currentCompletions[state.selectedCompletionIndex];
  const input = state.input;
  const text = input.value;
  
  // Remplacer le mot partiel par la complétion
  const newText = text.substring(0, state.partialWordStart) + 
                  completion + 
                  text.substring(state.partialWordStart + state.partialWord.length);
  
  input.value = newText;
  
  // Positionner le curseur après la complétion
  const newPos = state.partialWordStart + completion.length;
  input.setSelectionRange(newPos, newPos);
  
  hideCompletionBox(state);
  updateOverlayContent(state);
}

// Obtenir les coordonnées approximatives du caret (simplifié)
function getCaretCoordinates(element: HTMLInputElement | HTMLTextAreaElement, position: number) {
  // Cette fonction est simplifiée. Pour une implémentation complète,
  // il faudrait utiliser une bibliothèque comme textarea-caret-position
  return { left: 0, top: 0 };
}

// Observer un input/textarea
function observeInput(input: HTMLInputElement | HTMLTextAreaElement) {
  if (inputStates.has(input)) {
    return;
  }
  
  const overlay = createOverlay(input);
  const state: InputState = {
    input,
    overlay,
    completionBox: null,
    correctedWords: new Map(),
    lastValue: input.value,
    isComposing: false,
    selectedCompletionIndex: 0,
    currentCompletions: [],
    partialWord: '',
    partialWordStart: 0
  };
  
  inputStates.set(input, state);
  
  // Événement de saisie
  input.addEventListener('input', async (event) => {
    const newValue = input.value;
    const inputEvent = event as InputEvent;
    
    // Détecter si un espace a été ajouté
    if (inputEvent.data === ' ' && !state.isComposing) {
      await handleSpacePress(state);
    } else if (!state.isComposing) {
      // Gérer l'autocomplétion
      setTimeout(() => handleAutocompletion(state), 100);
    }
    
    state.lastValue = newValue;
    updateOverlayContent(state);
  });
  
  // Gérer les touches spéciales
  input.addEventListener('keydown', (event) => {
    if (state.currentCompletions.length > 0) {
      if (event.key === 'Tab') {
        event.preventDefault();
        acceptCompletion(state);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        state.selectedCompletionIndex = 
          (state.selectedCompletionIndex + 1) % state.currentCompletions.length;
        showCompletionBox(state, state.currentCompletions, state.partialWordStart);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        state.selectedCompletionIndex = 
          (state.selectedCompletionIndex - 1 + state.currentCompletions.length) % 
          state.currentCompletions.length;
        showCompletionBox(state, state.currentCompletions, state.partialWordStart);
      } else if (event.key === 'Escape') {
        hideCompletionBox(state);
      }
    }
  });
  
  // Gérer la composition (IME)
  input.addEventListener('compositionstart', () => {
    state.isComposing = true;
  });
  
  input.addEventListener('compositionend', () => {
    state.isComposing = false;
  });
  
  // Cacher les complétions lors du blur
  input.addEventListener('blur', () => {
    setTimeout(() => hideCompletionBox(state), 200);
  });
  
  // Mise à jour de la position
  const updatePosition = () => {
    updateOverlayPosition(input, overlay);
    if (state.completionBox && state.completionBox.style.display !== 'none') {
      hideCompletionBox(state);
    }
  };
  
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', updatePosition, { passive: true });
  
  const resizeObserver = new ResizeObserver(() => updatePosition());
  resizeObserver.observe(input);
}

// Observer tous les inputs existants
function observeAllInputs() {
  const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input:not([type]), textarea');
  inputs.forEach(input => observeInput(input as HTMLInputElement | HTMLTextAreaElement));
}

// Observer les nouveaux éléments
const mutationObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.matches('input[type="text"], input[type="search"], input[type="email"], input:not([type]), textarea')) {
            observeInput(element as HTMLInputElement | HTMLTextAreaElement);
          }
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
  
  @keyframes correctionPulse {
    0% { 
      text-decoration-color: #16a34a;
      text-shadow: 0 0 0 transparent;
    }
    50% { 
      text-decoration-color: #22c55e;
      text-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
    }
    100% { 
      text-decoration-color: #16a34a;
      text-shadow: 0 0 0 transparent;
    }
  }
  
  .correction-overlay .correction-highlight {
    text-decoration: underline;
    text-decoration-color: #16a34a;
    text-decoration-thickness: 2px;
  }
  
  .correction-overlay .correction-animate {
    text-decoration: underline;
    text-decoration-color: #16a34a;
    text-decoration-thickness: 2px;
    animation: correctionPulse 1s ease-in-out;
  }
  
  .correction-error-tooltip {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .completion-box {
    font-size: 14px;
  }
  
  .completion-item {
    transition: background-color 0.1s;
  }
  
  .completion-item:hover {
    background-color: #f3f4f6 !important;
    color: #111827 !important;
  }
  
  .completion-item.selected {
    background-color: #3b82f6 !important;
    color: white !important;
  }
`;
document.head.appendChild(style);

// Démarrer l'observation
observeAllInputs();
mutationObserver.observe(document.body, {
  childList: true,
  subtree: true
});