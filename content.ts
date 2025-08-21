// FICHIER: content.ts
interface InputState {
  input: HTMLInputElement | HTMLTextAreaElement;
  overlay: HTMLDivElement;
  correctedWords: Map<number, {word: string, originalWord: string}>;
  lastValue: string;
  isComposing: boolean;
  currentSuggestion: string;
  suggestionStart: number;
  pendingCorrection: AbortController | null;
  lastSpacePosition: number;
  correctionInProgress: boolean;
  completionTimeout?: number;
  originalValue: string;
  suggestionElement: HTMLSpanElement | null;
}

// Map des états pour chaque input
const inputStates = new Map<HTMLInputElement | HTMLTextAreaElement, InputState>();

// Extraire la phrase actuelle autour de la position du curseur
function getCurrentSentence(text: string, position: number): string {
  // Trouver le début de la phrase (après . ! ? ou début du texte)
  let start = position;
  while (start > 0) {
    const char = text[start - 1];
    if ('.!?'.includes(char)) {
      // Ignorer les espaces après la ponctuation
      while (start < text.length && text[start] === ' ') {
        start++;
      }
      break;
    }
    start--;
  }
  
  // Trouver la fin de la phrase
  let end = position;
  while (end < text.length && !'.!?'.includes(text[end])) {
    end++;
  }
  
  // Inclure la ponctuation finale si elle existe
  if (end < text.length && '.!?'.includes(text[end])) {
    end++;
  }
  
  const sentence = text.substring(start, end).trim();
  
  // Si la phrase est très courte ou très longue, essayer de prendre un contexte plus raisonnable
  if (sentence.length < 10 && position > 0) {
    // Prendre plus de contexte si la phrase est trop courte
    const extendedStart = Math.max(0, position - 100);
    const extendedEnd = Math.min(text.length, position + 50);
    return text.substring(extendedStart, extendedEnd).trim();
  }
  
  return sentence;
}

// Trouver les limites du mot à une position donnée
function getWordBounds(text: string, position: number): {start: number, end: number, word: string} {
  // Si on est sur un espace, prendre le mot précédent
  if (position > 0 && text[position - 1] === ' ') {
    position--;
  }
  
  // Trouver le début du mot (inclure apostrophes et traits d'union)
  let start = position;
  while (start > 0) {
    const char = text[start - 1];
    // Inclure lettres, chiffres, apostrophes, traits d'union
    if (/[a-zA-ZÀ-ÿ0-9'''-]/.test(char)) {
      start--;
    } else {
      break;
    }
  }
  
  // Trouver la fin du mot
  let end = position;
  while (end < text.length) {
    const char = text[end];
    if (/[a-zA-ZÀ-ÿ0-9'''-]/.test(char)) {
      end++;
    } else {
      break;
    }
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

// Créer l'élément de suggestion fantôme
function createSuggestionElement(): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'ghost-suggestion';
  span.style.cssText = `
    color: #9ca3af;
    pointer-events: none;
  `;
  return span;
}

// Mise à jour de la position de l'overlay
function updateOverlayPosition(input: HTMLInputElement | HTMLTextAreaElement, overlay: HTMLDivElement) {
  const rect = input.getBoundingClientRect();
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

// Mise à jour du contenu de l'overlay avec animations et suggestion
function updateOverlayContent(state: InputState, showSuggestion: boolean = true) {
  const text = state.input.value;
  const caretPos = state.input.selectionStart || text.length;
  let html = '';
  let charIndex = 0;
  
  // Traiter le texte caractère par caractère pour insérer la suggestion au bon endroit
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Vérifier si ce caractère fait partie d'un mot corrigé
    let hasCorrection = false;
    let correctionClass = '';
    
    for (const [pos, correction] of state.correctedWords) {
      if (i >= pos && i < pos + correction.originalWord.length) {
        hasCorrection = true;
        const isNew = Date.now() - (correction as any).timestamp < 1000;
        correctionClass = isNew ? 'correction-animate' : 'correction-highlight';
        break;
      }
    }
    
    // Ajouter le caractère avec ou sans style
    if (hasCorrection) {
      // Gérer les mots corrigés en entier
      const correctionEntry = Array.from(state.correctedWords.entries()).find(
        ([pos, corr]) => i === pos
      );
      if (correctionEntry) {
        const [_, corr] = correctionEntry;
        html += `<span class="${correctionClass}">${escapeHtml(corr.word)}</span>`;
        i += corr.originalWord.length - 1; // Sauter les caractères du mot original
        continue;
      }
    } else {
      html += escapeHtml(char);
    }
  }
  
  // Ajouter la suggestion fantôme si on est à la fin du texte
  if (showSuggestion && state.currentSuggestion && caretPos === text.length) {
    html += `<span class="ghost-suggestion">${escapeHtml(state.currentSuggestion)}</span>`;
  }
  
  state.overlay.innerHTML = html;
}

// Échapper le HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Obtenir le préfixe commun entre deux chaînes
function getCommonPrefix(str1: string, str2: string): string {
  let prefix = '';
  const minLength = Math.min(str1.length, str2.length);
  for (let i = 0; i < minLength; i++) {
    if (str1[i] === str2[i]) {
      prefix += str1[i];
    } else {
      break;
    }
  }
  return prefix;
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
async function handleSpacePress(state: InputState, spacePosition: number) {
  // Annuler toute correction en cours
  if (state.pendingCorrection) {
    state.pendingCorrection.abort();
    state.pendingCorrection = null;
  }
  
  const input = state.input;
  const text = input.value;
  
  // Extraire la phrase courante
  const sentence = getCurrentSentence(text, spacePosition);
  const sentenceStart = text.lastIndexOf(sentence, spacePosition);
  
  if (!sentence || sentence.trim().length < 3) {
    return;
  }
  
  // Marquer cette position d'espace et démarrer la correction
  state.lastSpacePosition = spacePosition;
  state.correctionInProgress = true;
  
  // Créer un AbortController pour pouvoir annuler cette correction
  const abortController = new AbortController();
  state.pendingCorrection = abortController;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'correct-word',
      sentence: sentence,
      fullText: text,
      cursorPosition: spacePosition - sentenceStart,
      sentenceStart: sentenceStart,
      tabId: chrome.runtime.id,
      inputId: input.id || 'unknown'
    });
    
    // Vérifier si la correction a été annulée
    if (abortController.signal.aborted) {
      return;
    }
    
    // Vérifier que l'utilisateur n'a pas continué à taper après l'espace
    const currentCaretPos = input.selectionStart;
    const currentText = input.value;
    
    // Si le texte a changé après l'espace ou si le curseur a bougé significativement, on annule
    if (currentCaretPos && currentCaretPos > state.lastSpacePosition + 1) {
      return;
    }
    
    if (response.error) {
      showErrorTooltip(input, response.error);
      return;
    }
    
    // Appliquer les corrections si la phrase a changé
    if (response.correctedSentence !== sentence && response.corrections && response.corrections.length > 0) {
      // Reconstruire le texte avec la phrase corrigée
      const newText = currentText.substring(0, sentenceStart) + 
                     response.correctedSentence + 
                     currentText.substring(sentenceStart + sentence.length);
      
      input.value = newText;
      
      // Calculer la nouvelle position du curseur
      let lengthDiff = 0;
      for (const correction of response.corrections) {
        if (sentenceStart + correction.start < spacePosition) {
          lengthDiff += correction.corrected.length - correction.original.length;
        }
      }
      
      const newCaretPos = state.lastSpacePosition + lengthDiff;
      input.setSelectionRange(newCaretPos, newCaretPos);
      
      // Enregistrer toutes les corrections avec timestamp pour l'animation
      const now = Date.now();
      for (const correction of response.corrections) {
        const globalStart = sentenceStart + correction.start;
        state.correctedWords.set(globalStart, {
          word: correction.corrected,
          originalWord: correction.original,
          timestamp: now
        } as any);
      }
      
      updateOverlayContent(state);
    }
  } catch (error) {
    if (!abortController.signal.aborted) {
      console.error('Erreur lors de la correction:', error);
    }
  } finally {
    state.correctionInProgress = false;
    if (state.pendingCorrection === abortController) {
      state.pendingCorrection = null;
    }
  }
}

// Gérer l'autocomplétion
async function handleAutocompletion(state: InputState) {
  // Ne pas faire d'autocomplétion si une correction est en cours
  if (state.correctionInProgress || state.pendingCorrection) {
    hideSuggestion(state);
    return;
  }
  
  const input = state.input;
  const caretPos = input.selectionStart;
  
  // Autocomplétion seulement si on est à la fin du texte
  if (!caretPos || state.isComposing || caretPos !== input.value.length) {
    hideSuggestion(state);
    return;
  }
  
  const text = input.value;
  const wordBounds = getWordBounds(text, caretPos);
  
  // Permettre l'autocomplétion même pour des mots très courts (pour corriger "a" en "à" par exemple)
  if (!wordBounds.word) {
    hideSuggestion(state);
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'get-completions',
      partialWord: wordBounds.word,
      fullText: text,
      position: wordBounds.start
    });
    
    if (response.suggestions && response.suggestions.length > 0) {
      const firstSuggestion = response.suggestions[0];
      
      if (firstSuggestion.startsWith(wordBounds.word)) {
        // Suggestion normale - afficher seulement la partie à ajouter
        const completion = firstSuggestion.substring(wordBounds.word.length);
        if (completion) {
          showSuggestion(state, completion, caretPos);
        } else {
          hideSuggestion(state);
        }
      } else {
        // Correction potentielle - remplacer le mot entier
        // Calculer ce qui doit être remplacé
        const commonPrefix = getCommonPrefix(wordBounds.word, firstSuggestion);
        if (commonPrefix.length > 0) {
          // Afficher la partie à ajouter/remplacer après le préfixe commun
          const toReplace = firstSuggestion.substring(commonPrefix.length);
          if (toReplace) {
            // Pour une correction, on doit indiquer qu'on remplace une partie du mot
            state.suggestionStart = wordBounds.start + commonPrefix.length;
            state.currentSuggestion = toReplace;
            state.originalValue = text.substring(0, state.suggestionStart) + text.substring(caretPos);
            updateOverlayContent(state);
            return;
          }
        }
        hideSuggestion(state);
      }
    } else {
      hideSuggestion(state);
    }
  } catch (error) {
    console.error('Erreur autocomplétion:', error);
    hideSuggestion(state);
  }
}

// Afficher la suggestion fantôme
function showSuggestion(state: InputState, suggestion: string, position: number) {
  state.currentSuggestion = suggestion;
  state.suggestionStart = position;
  state.originalValue = state.input.value;
  updateOverlayContent(state);
}

// Cacher la suggestion
function hideSuggestion(state: InputState) {
  state.currentSuggestion = '';
  state.suggestionStart = -1;
  updateOverlayContent(state);
}

// Accepter la suggestion
function acceptSuggestion(state: InputState) {
  if (!state.currentSuggestion) return;
  
  const input = state.input;
  const currentText = input.value;
  const caretPos = input.selectionStart || currentText.length;
  
  // Construire le nouveau texte
  let newText: string;
  let newCaretPos: number;
  
  if (state.suggestionStart < currentText.length) {
    // Correction - remplacer une partie du texte
    newText = currentText.substring(0, state.suggestionStart) + 
              state.currentSuggestion + 
              currentText.substring(caretPos);
    newCaretPos = state.suggestionStart + state.currentSuggestion.length;
  } else {
    // Ajout simple à la fin
    newText = currentText + state.currentSuggestion;
    newCaretPos = newText.length;
  }
  
  input.value = newText;
  input.setSelectionRange(newCaretPos, newCaretPos);
  
  // Mettre à jour l'état
  state.lastValue = newText;
  hideSuggestion(state);
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
    correctedWords: new Map(),
    lastValue: input.value,
    isComposing: false,
    currentSuggestion: '',
    suggestionStart: -1,
    pendingCorrection: null,
    lastSpacePosition: -1,
    correctionInProgress: false,
    originalValue: input.value,
    suggestionElement: null
  };
  
  inputStates.set(input, state);
  
  // Événement de saisie
  input.addEventListener('input', async (event) => {
    const newValue = input.value;
    const oldValue = state.lastValue;
    const inputEvent = event as InputEvent;
    const caretPos = input.selectionStart || 0;
    
    // Si on tape un caractère après un espace, annuler toute correction en cours
    if (state.pendingCorrection && caretPos > state.lastSpacePosition) {
      state.pendingCorrection.abort();
      state.pendingCorrection = null;
    }
    
    // Détecter si un espace ou une ponctuation a été ajoutée
    const triggers = [' ', '.', ',', '!', '?', ';', ':'];
    if (!state.isComposing && inputEvent.data && triggers.includes(inputEvent.data)) {
      // Vérifier que c'est bien un ajout (pas un remplacement)
      if (newValue.length > oldValue.length) {
        await handleSpacePress(state, caretPos - 1);
      }
    } else if (!state.isComposing && inputEvent.data && !triggers.includes(inputEvent.data)) {
      // Si on tape un caractère non-espace, annuler les corrections en cours
      if (state.pendingCorrection) {
        state.pendingCorrection.abort();
        state.pendingCorrection = null;
      }
      
      // Gérer l'autocomplétion seulement si on n'est pas en train de corriger
      if (!state.correctionInProgress) {
        // Débouncer l'autocomplétion avec un délai plus court
        if (state.completionTimeout) {
          clearTimeout(state.completionTimeout);
        }
        state.completionTimeout = setTimeout(() => handleAutocompletion(state), 100);
      }
    } else if (inputEvent.inputType === 'deleteContentBackward' || inputEvent.inputType === 'deleteContentForward') {
      // Cacher la suggestion si on efface
      hideSuggestion(state);
    }
    
    // Si le texte change, cacher la suggestion actuelle
    if (state.currentSuggestion && newValue !== state.originalValue + state.currentSuggestion) {
      hideSuggestion(state);
    }
    
    state.lastValue = newValue;
    updateOverlayContent(state);
  });
  
  // Gérer les touches spéciales
  input.addEventListener('keydown', (event) => {
    // Annuler la correction si on utilise Backspace ou Delete
    if ((event.key === 'Backspace' || event.key === 'Delete') && state.pendingCorrection) {
      state.pendingCorrection.abort();
      state.pendingCorrection = null;
    }
    
    // Gérer Tab pour accepter la suggestion
    if (event.key === 'Tab' && state.currentSuggestion) {
      event.preventDefault();
      acceptSuggestion(state);
    } else if (event.key === 'Escape' && state.currentSuggestion) {
      // Échap pour cacher la suggestion
      hideSuggestion(state);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || 
               event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
               event.key === 'Home' || event.key === 'End') {
      // Cacher la suggestion si on navigue
      hideSuggestion(state);
    }
  });
  
  // Gérer la composition (IME)
  input.addEventListener('compositionstart', () => {
    state.isComposing = true;
  });
  
  input.addEventListener('compositionend', () => {
    state.isComposing = false;
  });
  
  // Cacher la suggestion lors du blur
  input.addEventListener('blur', () => {
    setTimeout(() => hideSuggestion(state), 200);
  });
  
  // Mise à jour de la position
  const updatePosition = () => {
    updateOverlayPosition(input, overlay);
    if (state.currentSuggestion) {
      hideSuggestion(state);
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
  
  .correction-overlay .ghost-suggestion {
    color: #9ca3af;
    opacity: 0.7;
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