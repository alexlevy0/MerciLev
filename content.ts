// FICHIER: content.ts
interface EditableElement {
  element: HTMLElement;
  type: 'input' | 'textarea' | 'contenteditable' | 'canvas' | 'custom';
  getValue: () => string;
  setValue: (value: string) => void;
  getCaretPosition: () => number;
  setCaretPosition: (pos: number) => void;
  isEditable: () => boolean;
}

interface InputState {
  element: EditableElement;
  overlay: HTMLDivElement;
  correctedWords: Map<number, {word: string, originalWord: string, timestamp?: number}>;
  lastValue: string;
  isComposing: boolean;
  pendingCorrection: AbortController | null;
  lastSpacePosition: number;
  correctionInProgress: boolean;
  statusIndicator?: HTMLDivElement;
  performanceStats: {
    lastCorrectionTime?: number;
    averageTime?: number;
    correctionCount: number;
    cacheHits: number;
  };
}

// Map des états pour chaque élément éditable
const elementStates = new Map<HTMLElement, InputState>();

// Créer l'indicateur de statut
function createStatusIndicator(wrapper: EditableElement): HTMLDivElement {
  const indicator = document.createElement('div');
  indicator.className = 'ollama-status hidden';
  indicator.innerHTML = `
    <div class="ollama-status-icon"></div>
    <span class="ollama-status-text">Prêt</span>
    <span class="ollama-status-time"></span>
    <span class="ollama-status-count">0</span>
    <div class="ollama-status-details"></div>
  `;
  
  // Positionner l'indicateur selon le type d'élément
  const element = wrapper.element;
  const parent = element.parentElement;
  
  // Détecter si l'élément est petit
  const rect = element.getBoundingClientRect();
  if (rect.width < 300 || rect.height < 40) {
    indicator.classList.add('compact');
  }
  
  if (wrapper.type === 'contenteditable' || wrapper.type === 'custom') {
    // Pour contenteditable, positionner en fixed
    document.body.appendChild(indicator);
    indicator.style.position = 'fixed';
    
    const updatePosition = () => {
      const newRect = element.getBoundingClientRect();
      const indicatorWidth = 200;
      let left = newRect.right - indicatorWidth;
      let top = newRect.top + 5;
      
      // Ajuster si dépassement de l'écran
      if (left < 10) left = 10;
      if (left + indicatorWidth > window.innerWidth - 10) {
        left = window.innerWidth - indicatorWidth - 10;
      }
      
      indicator.style.left = `${left}px`;
      indicator.style.top = `${top}px`;
    };
    
    updatePosition();
    
    // Mettre à jour lors du scroll/resize
    let updateTimeout: number | undefined;
    const debouncedUpdate = () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      updateTimeout = setTimeout(updatePosition, 10);
    };
    
    window.addEventListener('scroll', debouncedUpdate, { passive: true });
    window.addEventListener('resize', debouncedUpdate, { passive: true });
    
    // Nettoyer l'indicateur si l'élément est supprimé
    const observer = new MutationObserver(() => {
      if (!document.contains(element)) {
        indicator.remove();
        window.removeEventListener('scroll', debouncedUpdate);
        window.removeEventListener('resize', debouncedUpdate);
        observer.disconnect();
      }
    });
    observer.observe(element.parentElement || document.body, { childList: true, subtree: true });
  } else if (parent) {
    // Pour input/textarea standard
    parent.style.position = 'relative';
    parent.appendChild(indicator);
  }
  
  return indicator;
}

// Mettre à jour l'indicateur de statut
function updateStatusIndicator(state: InputState, status: 'idle' | 'loading' | 'processing' | 'error' | 'cached', text?: string, time?: number) {
  if (!state.statusIndicator) return;
  
  const indicator = state.statusIndicator;
  const textElement = indicator.querySelector('.ollama-status-text') as HTMLElement;
  const timeElement = indicator.querySelector('.ollama-status-time') as HTMLElement;
  const countElement = indicator.querySelector('.ollama-status-count') as HTMLElement;
  const detailsElement = indicator.querySelector('.ollama-status-details') as HTMLElement;
  
  // Réinitialiser les classes
  indicator.classList.remove('hidden', 'loading', 'processing', 'error', 'cached');
  
  // Mettre à jour le compteur
  const totalQueries = state.performanceStats.correctionCount + state.performanceStats.cacheHits;
  countElement.textContent = `${totalQueries}`;
  
  // Créer le texte détaillé
  const avgTime = state.performanceStats.averageTime ? Math.round(state.performanceStats.averageTime) : 0;
  const cacheRate = totalQueries > 0 ? Math.round((state.performanceStats.cacheHits / totalQueries) * 100) : 0;
  
  switch (status) {
    case 'idle':
      if (time === 0) {
        // Ne pas masquer si on vient d'afficher un résultat
        indicator.classList.remove('hidden');
        textElement.textContent = text || 'OK';
      } else {
        indicator.classList.add('hidden');
      }
      break;
    case 'loading':
      indicator.classList.remove('hidden');
      indicator.classList.add('loading');
      textElement.textContent = text || 'Connexion...';
      detailsElement.textContent = `Requête #${totalQueries + 1}`;
      break;
    case 'processing':
      indicator.classList.remove('hidden');
      indicator.classList.add('processing');
      textElement.textContent = text || 'Analyse...';
      detailsElement.textContent = `Moy: ${avgTime}ms | Cache: ${cacheRate}%`;
      break;
    case 'error':
      indicator.classList.remove('hidden');
      indicator.classList.add('error');
      textElement.textContent = text || 'Erreur';
      detailsElement.textContent = 'Vérifier Ollama';
      break;
    case 'cached':
      indicator.classList.remove('hidden');
      indicator.classList.add('cached');
      textElement.textContent = '⚡ Cache';
      detailsElement.textContent = `Hit #${state.performanceStats.cacheHits}/${totalQueries}`;
      
      // Ajouter l'animation de cache
      const cacheIcon = document.createElement('span');
      cacheIcon.className = 'cache-hit-animation';
      cacheIcon.textContent = '💾';
      indicator.appendChild(cacheIcon);
      setTimeout(() => cacheIcon.remove(), 1000);
      break;
  }
  
  // Afficher le temps avec animation
  if (time !== undefined && timeElement) {
    if (time === 0) {
      timeElement.innerHTML = '<span class="instant">0ms</span>';
    } else {
      timeElement.textContent = `${time}ms`;
      // Animation pour les temps longs
      if (time > 5000) {
        timeElement.classList.add('slow');
      } else if (time < 1000) {
        timeElement.classList.add('fast');
      }
    }
    
    // Garder le dernier temps affiché
    state.performanceStats.lastCorrectionTime = time;
  } else if (state.performanceStats.lastCorrectionTime && timeElement) {
    timeElement.textContent = `${state.performanceStats.lastCorrectionTime}ms`;
    timeElement.style.opacity = '0.6';
  }
  
  // Animation de transition pour les changements de statut
  indicator.style.animation = 'none';
  setTimeout(() => {
    indicator.style.animation = 'statusChange 0.3s ease-out';
  }, 10);
  
  // Masquer automatiquement après un délai variable
  if (status === 'idle' || status === 'cached') {
    const hideDelay = status === 'cached' ? 2000 : 4000;
    setTimeout(() => {
      indicator.classList.add('fading');
      setTimeout(() => {
        indicator.classList.add('hidden');
        indicator.classList.remove('fading');
      }, 300);
    }, hideDelay);
  }
}

// Détecter le type d'élément éditable et créer un wrapper
function createEditableWrapper(element: HTMLElement): EditableElement | null {
  // Input et textarea standards
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return {
      element,
      type: element instanceof HTMLInputElement ? 'input' : 'textarea',
      getValue: () => element.value,
      setValue: (value: string) => { element.value = value; },
      getCaretPosition: () => element.selectionStart || 0,
      setCaretPosition: (pos: number) => { element.setSelectionRange(pos, pos); },
      isEditable: () => !element.disabled && !element.readOnly
    };
  }
  
  // Éléments contenteditable
  if (element.contentEditable === 'true' || element.isContentEditable) {
    return {
      element,
      type: 'contenteditable',
      getValue: () => element.textContent || '',
      setValue: (value: string) => { 
        // Préserver la structure HTML si possible
        if (element.innerHTML.includes('<')) {
          // Remplacer seulement le texte, pas les balises
          const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
          );
          
          let node;
          let offset = 0;
          while (node = walker.nextNode()) {
            const textNode = node as Text;
            const len = textNode.textContent?.length || 0;
            if (offset + len >= value.length) {
              textNode.textContent = value.substring(offset);
              break;
            }
            textNode.textContent = value.substring(offset, offset + len);
            offset += len;
          }
        } else {
          element.textContent = value;
        }
      },
      getCaretPosition: () => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return 0;
        
        const range = sel.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        
        return preCaretRange.toString().length;
      },
      setCaretPosition: (pos: number) => {
        const range = document.createRange();
        const sel = window.getSelection();
        if (!sel) return;
        
        let currentPos = 0;
        let found = false;
        
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let node;
        while (node = walker.nextNode()) {
          const textNode = node as Text;
          const len = textNode.textContent?.length || 0;
          
          if (currentPos + len >= pos) {
            range.setStart(textNode, pos - currentPos);
            range.collapse(true);
            found = true;
            break;
          }
          
          currentPos += len;
        }
        
        if (found) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
      },
      isEditable: () => element.contentEditable === 'true'
    };
  }
  
  // Éléments avec role="textbox"
  if (element.getAttribute('role') === 'textbox') {
    return {
      element,
      type: 'custom',
      getValue: () => element.textContent || '',
      setValue: (value: string) => { element.textContent = value; },
      getCaretPosition: () => 0, // À implémenter selon le site
      setCaretPosition: (pos: number) => {}, // À implémenter selon le site
      isEditable: () => true
    };
  }
  
  return null;
}

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
function createOverlay(wrapper: EditableElement): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'correction-overlay';
  
  const element = wrapper.element;
  const computedStyle = window.getComputedStyle(element);
  
  overlay.style.cssText = `
    position: absolute;
    pointer-events: none;
    white-space: ${computedStyle.whiteSpace};
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
  
  updateOverlayPosition(element, overlay);
  
  // Insérer l'overlay juste après l'élément
  if (element.parentElement) {
    element.parentElement.insertBefore(overlay, element.nextSibling);
  } else {
    document.body.appendChild(overlay);
  }
  
  return overlay;
}

// Fonction de suggestion supprimée

// Mise à jour de la position de l'overlay
function updateOverlayPosition(element: HTMLElement, overlay: HTMLDivElement) {
  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);
  
  overlay.style.left = `${rect.left + window.scrollX}px`;
  overlay.style.top = `${rect.top + window.scrollY}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  
  // Pour les éléments contenteditable, ajuster la hauteur si nécessaire
  if (element.contentEditable === 'true') {
    overlay.style.minHeight = computedStyle.minHeight;
    overlay.style.maxHeight = computedStyle.maxHeight;
  }
}

// Mise à jour du contenu de l'overlay avec animations et suggestion
function updateOverlayContent(state: InputState) {
  const text = state.element.getValue();
  const caretPos = state.element.getCaretPosition();
  let html = '';
  
  // Traiter le texte caractère par caractère
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Vérifier si ce caractère fait partie d'un mot corrigé
    let hasCorrection = false;
    let correctionClass = '';
    
    for (const [pos, correction] of state.correctedWords) {
      if (i >= pos && i < pos + correction.originalWord.length) {
        hasCorrection = true;
        const isNew = Date.now() - (correction.timestamp || 0) < 1000;
        correctionClass = isNew ? 'correction-animate' : 'correction-highlight';
        break;
      }
    }
    
    if (hasCorrection) {
      const correctionEntry = Array.from(state.correctedWords.entries()).find(
        ([pos, corr]) => i === pos
      );
      if (correctionEntry) {
        const [_, corr] = correctionEntry;
        html += `<span class="${correctionClass}">${escapeHtml(corr.word)}</span>`;
        i += corr.originalWord.length - 1;
        continue;
      }
    } else {
      html += escapeHtml(char);
    }
  }
  
  // Autocomplétion supprimée
  
  state.overlay.innerHTML = html;
  
  // Forcer la mise à jour de la position de l'overlay
  updateOverlayPosition(state.element.element, state.overlay);
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
  
  const text = state.element.getValue();
  
  // Extraire la phrase courante
  const sentence = getCurrentSentence(text, spacePosition);
  const sentenceStart = text.lastIndexOf(sentence, spacePosition);
  
  if (!sentence || sentence.trim().length < 3) {
    return;
  }
  
  // Analyse rapide pour détecter si la phrase a probablement des erreurs
  const quickCheck = analyzeForPotentialErrors(sentence);
  if (!quickCheck.hasPotentialErrors) {
    updateStatusIndicator(state, 'idle', 'OK', 0);
    return;
  }
  
  // Vérifier le cache d'abord
  const cacheKey = sentence.trim();
  const cached = correctionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    state.performanceStats.cacheHits++;
    updateStatusIndicator(state, 'cached', 'Cache', 0);
    
    // Appliquer la correction depuis le cache
    if (cached.result !== sentence) {
      const currentText = state.element.getValue();
      const newText = currentText.substring(0, sentenceStart) + 
                     cached.result + 
                     currentText.substring(sentenceStart + sentence.length);
      state.element.setValue(newText);
      state.element.setCaretPosition(spacePosition + (cached.result.length - sentence.length));
      updateOverlayContent(state);
    }
    return;
  }
  
  // Marquer cette position d'espace et démarrer la correction
  state.lastSpacePosition = spacePosition;
  state.correctionInProgress = true;
  
  // Afficher l'indicateur de chargement
  updateStatusIndicator(state, 'loading', 'Connexion...');
  
  // Créer un AbortController pour pouvoir annuler cette correction
  const abortController = new AbortController();
  state.pendingCorrection = abortController;
  
  const startTime = performance.now();
  
  try {
    updateStatusIndicator(state, 'processing', 'Analyse...');
    
    const response = await chrome.runtime.sendMessage({
      type: 'correct-word',
      sentence: sentence,
      fullText: text,
      cursorPosition: spacePosition - sentenceStart,
      sentenceStart: sentenceStart,
      tabId: chrome.runtime.id,
      inputId: 'unknown'
    });
    
    // Vérifier si la correction a été annulée
    if (abortController.signal.aborted) {
      return;
    }
    
    // Vérifier que l'utilisateur n'a pas continué à taper après l'espace
    const currentCaretPos = state.element.getCaretPosition();
    const currentText = state.element.getValue();
    
    // Si le texte a changé après l'espace ou si le curseur a bougé significativement, on annule
    if (currentCaretPos && currentCaretPos > state.lastSpacePosition + 1) {
      return;
    }
    
    const endTime = performance.now();
    const correctionTime = Math.round(endTime - startTime);
    
    // Mettre à jour les statistiques
    state.performanceStats.correctionCount++;
    state.performanceStats.lastCorrectionTime = correctionTime;
    if (state.performanceStats.averageTime) {
      state.performanceStats.averageTime = 
        (state.performanceStats.averageTime * (state.performanceStats.correctionCount - 1) + correctionTime) / 
        state.performanceStats.correctionCount;
    } else {
      state.performanceStats.averageTime = correctionTime;
    }
    
    if (response.error) {
      updateStatusIndicator(state, 'error', 'Erreur', correctionTime);
      showErrorTooltip(state.element.element, response.error);
      return;
    }
    
    // Mettre en cache la réponse
    correctionCache.set(cacheKey, {
      result: response.correctedSentence || sentence,
      timestamp: Date.now()
    });
    
    // Appliquer les corrections si la phrase a changé
    if (response.correctedSentence !== sentence && response.corrections && response.corrections.length > 0) {
      updateStatusIndicator(state, 'idle', 'Corrigé', correctionTime);
      // Reconstruire le texte avec la phrase corrigée
      const newText = currentText.substring(0, sentenceStart) + 
                     response.correctedSentence + 
                     currentText.substring(sentenceStart + sentence.length);
      
      state.element.setValue(newText);
      
      // Calculer la nouvelle position du curseur
      let lengthDiff = 0;
      for (const correction of response.corrections) {
        if (sentenceStart + correction.start < spacePosition) {
          lengthDiff += correction.corrected.length - correction.original.length;
        }
      }
      
      const newCaretPos = state.lastSpacePosition + lengthDiff;
      state.element.setCaretPosition(newCaretPos);
      
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
    } else {
      // Aucune correction nécessaire
      updateStatusIndicator(state, 'idle', 'OK', correctionTime);
    }
  } catch (error) {
    if (!abortController.signal.aborted) {
      console.error('Erreur lors de la correction:', error);
      const errorTime = Math.round(performance.now() - startTime);
      updateStatusIndicator(state, 'error', 'Erreur', errorTime);
    }
  } finally {
    state.correctionInProgress = false;
    if (state.pendingCorrection === abortController) {
      state.pendingCorrection = null;
    }
  }
}

// Autocomplétion supprimée pour améliorer les performances

/*
// Anciennes fonctions d'autocomplétion - supprimées
async function handleAutocompletion(state: InputState) {
  // Permettre l'autocomplétion même pendant une correction
  const caretPos = state.element.getCaretPosition();
  const text = state.element.getValue();
  
  // Autocomplétion seulement si on est à la fin du texte
  if (!caretPos || state.isComposing || caretPos !== text.length) {
    hideSuggestion(state);
    return;
  }
  
  const wordBounds = getWordBounds(text, caretPos);
  
  // Permettre l'autocomplétion même pour un seul caractère
  if (!wordBounds.word || wordBounds.word.length < 1) {
    hideSuggestion(state);
    return;
  }
  
  // Vérifier le cache d'abord
  const cacheKey = `${wordBounds.word}:${text.substring(Math.max(0, wordBounds.start - 20), wordBounds.start)}`;
  const cached = completionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < COMPLETION_CACHE_DURATION) {
    if (cached.suggestions.length > 0) {
      showSuggestion(state, cached.suggestions[0], wordBounds.start);
    }
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'get-completions',
      partialWord: wordBounds.word,
      fullText: text,
      position: wordBounds.start
    });
    
    // Mettre en cache la réponse
    if (response.suggestions) {
      completionCache.set(cacheKey, {
        suggestions: response.suggestions,
        timestamp: Date.now()
      });
    }
    
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
  state.originalValue = state.element.getValue();
  console.log('💡 Suggestion:', suggestion, 'à la position:', position);
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
  
  const currentText = state.element.getValue();
  const caretPos = state.element.getCaretPosition();
  
  let newText: string;
  let newCaretPos: number;
  
  if (state.suggestionStart < currentText.length) {
    newText = currentText.substring(0, state.suggestionStart) + 
              state.currentSuggestion + 
              currentText.substring(caretPos);
    newCaretPos = state.suggestionStart + state.currentSuggestion.length;
  } else {
    newText = currentText + state.currentSuggestion;
    newCaretPos = newText.length;
  }
  
  state.element.setValue(newText);
  state.element.setCaretPosition(newCaretPos);
  
  state.lastValue = newText;
  hideSuggestion(state);
}
*/

// Observer les changements sur un élément éditable
function observeEditableElement(element: HTMLElement) {
  const wrapper = createEditableWrapper(element);
  if (!wrapper || !wrapper.isEditable()) return;
  
  // Vérifier si déjà observé
  if (elementStates.has(element)) return;
  
  const overlay = createOverlay(wrapper);
  const statusIndicator = createStatusIndicator(wrapper);
  
  const state: InputState = {
    element: wrapper,
    overlay,
    correctedWords: new Map(),
    lastValue: wrapper.getValue(),
    isComposing: false,
    pendingCorrection: null,
    lastSpacePosition: -1,
    correctionInProgress: false,
    statusIndicator,
    performanceStats: {
      correctionCount: 0,
      cacheHits: 0
    }
  };
  
  elementStates.set(element, state);
  
  // Observer le redimensionnement pour les contenteditable
  if (wrapper.type === 'contenteditable' || wrapper.type === 'custom') {
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => {
        if (state.statusIndicator && !state.statusIndicator.classList.contains('hidden')) {
          const rect = element.getBoundingClientRect();
          const indicatorWidth = 200;
          let left = rect.right - indicatorWidth;
          let top = rect.top + 5;
          
          // Ajuster si dépassement
          if (left < 10) left = 10;
          if (left + indicatorWidth > window.innerWidth - 10) {
            left = window.innerWidth - indicatorWidth - 10;
          }
          
          state.statusIndicator.style.left = `${left}px`;
          state.statusIndicator.style.top = `${top}px`;
          
          // Mettre à jour le mode compact si nécessaire
          if (rect.width < 300 || rect.height < 40) {
            state.statusIndicator.classList.add('compact');
          } else {
            state.statusIndicator.classList.remove('compact');
          }
        }
      });
      resizeObserver.observe(element);
    }
  }
  
  // Observer les changements selon le type d'élément
  if (wrapper.type === 'input' || wrapper.type === 'textarea') {
    observeInputElement(element as HTMLInputElement | HTMLTextAreaElement, state);
  } else {
    observeContentEditableElement(element, state);
  }
}

// Observer un input/textarea classique
function observeInputElement(input: HTMLInputElement | HTMLTextAreaElement, state: InputState) {
  // Événement de saisie
  input.addEventListener('input', async (event) => {
    await handleInput(state, event as InputEvent);
  });
  
  // Touches spéciales
  input.addEventListener('keydown', (event) => {
    handleKeyDown(state, event);
  });
  
  // Composition IME
  input.addEventListener('compositionstart', () => {
    state.isComposing = true;
  });
  
  input.addEventListener('compositionend', () => {
    state.isComposing = false;
  });
  
  // Focus/Blur - autocomplétion supprimée
}

// Observer un élément contenteditable
function observeContentEditableElement(element: HTMLElement, state: InputState) {
  // MutationObserver pour détecter les changements
  const observer = new MutationObserver(async (mutations) => {
    const newValue = state.element.getValue();
    if (newValue !== state.lastValue) {
      // Créer un InputEvent simulé
      const event = new InputEvent('input', {
        data: newValue.slice(-1),
        inputType: 'insertText'
      });
      await handleInput(state, event);
    }
  });
  
  observer.observe(element, {
    childList: true,
    characterData: true,
    subtree: true
  });
  
  // Événements clavier
  element.addEventListener('keydown', (event) => {
    handleKeyDown(state, event);
  });
  
  // Composition IME
  element.addEventListener('compositionstart', () => {
    state.isComposing = true;
  });
  
  element.addEventListener('compositionend', () => {
    state.isComposing = false;
  });
  
  // Focus/Blur - autocomplétion supprimée
  
  // Intercepter les événements beforeinput pour certains éditeurs
  element.addEventListener('beforeinput', async (event) => {
    if (event.inputType === 'insertText' && event.data) {
      // Attendre un peu pour que le texte soit inséré
      setTimeout(async () => {
        await handleInput(state, event);
      }, 10);
    }
  });
}

// Gérer l'input
async function handleInput(state: InputState, event: InputEvent) {
  const newValue = state.element.getValue();
  const oldValue = state.lastValue;
  const caretPos = state.element.getCaretPosition();
  
  // Si on tape un caractère après un espace, annuler toute correction en cours
  if (state.pendingCorrection && caretPos > state.lastSpacePosition) {
    state.pendingCorrection.abort();
    state.pendingCorrection = null;
  }
  
  // Détecter si un espace ou une ponctuation a été ajoutée
  const triggers = [' ', '.', ',', '!', '?', ';', ':'];
  if (!state.isComposing && event.data && triggers.includes(event.data)) {
    // Vérifier que c'est bien un ajout
    if (newValue.length > oldValue.length) {
      await handleSpacePress(state, caretPos - 1);
    }
  } else if (!state.isComposing && event.data && !triggers.includes(event.data)) {
    // Si on tape un caractère non-trigger, annuler les corrections en cours
    if (state.pendingCorrection) {
      state.pendingCorrection.abort();
      state.pendingCorrection = null;
    }
    
    // Autocomplétion supprimée pour améliorer les performances
  }
  
  state.lastValue = newValue;
  updateOverlayContent(state);
}

// Gérer les touches spéciales
function handleKeyDown(state: InputState, event: KeyboardEvent) {
  // Annuler la correction si on utilise Backspace ou Delete
  if ((event.key === 'Backspace' || event.key === 'Delete') && state.pendingCorrection) {
    state.pendingCorrection.abort();
    state.pendingCorrection = null;
  }
  
  // Autocomplétion supprimée - ces touches ne font plus rien de spécial
}

// Observer tous les éléments éditables
function observeAllEditableElements() {
  // Inputs et textareas standards
  const standardInputs = document.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input:not([type]), textarea');
  standardInputs.forEach(element => observeEditableElement(element as HTMLElement));
  
  // Éléments contenteditable
  const contentEditables = document.querySelectorAll('[contenteditable="true"], [contenteditable=""]');
  contentEditables.forEach(element => observeEditableElement(element as HTMLElement));
  
  // Éléments avec role="textbox"
  const textboxRoles = document.querySelectorAll('[role="textbox"]');
  textboxRoles.forEach(element => observeEditableElement(element as HTMLElement));
  
  // Certains éditeurs utilisent des divs avec des classes spécifiques
  const customEditors = document.querySelectorAll('.editor, .text-editor, .input-field, .editable, .draft-editor, .ql-editor, .ace_editor, .monaco-editor, .cm-editor');
  customEditors.forEach(element => observeEditableElement(element as HTMLElement));
}

// Observer les nouveaux éléments ajoutés au DOM
const mutationObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // Vérifier si c'est un élément éditable
          if (element.matches('input, textarea, [contenteditable], [role="textbox"]')) {
            observeEditableElement(element);
          }
          
          // Chercher dans les enfants
          const editables = element.querySelectorAll('input, textarea, [contenteditable], [role="textbox"], .editor, .text-editor');
          editables.forEach(child => observeEditableElement(child as HTMLElement));
        }
      });
    }
    
    // Observer aussi les changements d'attributs
    if (mutation.type === 'attributes') {
      const element = mutation.target as HTMLElement;
      if (mutation.attributeName === 'contenteditable' || mutation.attributeName === 'role') {
        observeEditableElement(element);
      }
    }
  }
});

// Cache pour les corrections
const correctionCache = new Map<string, {result: string, timestamp: number}>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Patterns d'erreurs courantes pour une détection rapide
const ERROR_PATTERNS = {
  // Espaces manquants
  missingSpaces: /[a-zàâäéèêëïîôùûüÿç][A-Z]|[a-z](ne|est|pas|mais|donc|puis|car|que)[a-z]/i,
  // Homophones courants
  homophones: /\b(sa va|a la |mais pas|c'est [a-z]+s sont|tout les|ce sont trompé|pour allez)\b/i,
  // Fautes courantes
  commonErrors: /\b(phaute|ecole|ecrire|apres|tres|francais|etre|hopital|etat|etait|ca va|ilfaut|jene|c'estpas)\b/i,
  // Accords suspects
  suspectAgreements: /\b(un[e]? \w+s|des? \w+[^s])\b/i,
  // Conjugaison suspecte
  suspectConjugation: /\b(tu va[^s]|il \w+s|elle \w+s|ils \w+[^nt]|elles \w+[^nt])\b/i
};

// Analyse rapide pour détecter les erreurs potentielles
function analyzeForPotentialErrors(text: string): {hasPotentialErrors: boolean, patterns: string[]} {
  const patterns: string[] = [];
  
  for (const [name, pattern] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.test(text)) {
      patterns.push(name);
    }
  }
  
  return {
    hasPotentialErrors: patterns.length > 0,
    patterns
  };
}

// Ajouter les styles CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes pulse {
    0% { opacity: 0.4; }
    50% { opacity: 1; }
    100% { opacity: 0.4; }
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .ollama-status {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 16px;
    font-size: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    color: #374151;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
    z-index: 10001;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(8px);
  }
  
  .ollama-status.hidden {
    opacity: 0;
    transform: translateY(-50%) scale(0.9);
  }
  
  .ollama-status.fading {
    opacity: 0;
    transform: translateY(-50%) translateX(20px);
  }
  
  .ollama-status-icon {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    position: relative;
    flex-shrink: 0;
  }
  
  .ollama-status.loading .ollama-status-icon {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .ollama-status.error .ollama-status-icon {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }
  
  .ollama-status.cached .ollama-status-icon {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  }
  
  .ollama-status.processing .ollama-status-icon {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }
  
  .ollama-status.processing .ollama-status-icon::after {
    content: '';
    position: absolute;
    top: -3px;
    left: -3px;
    right: -3px;
    bottom: -3px;
    border: 2px solid transparent;
    border-top-color: #3b82f6;
    border-right-color: #3b82f6;
    border-radius: 50%;
    animation: rotate 0.8s linear infinite;
  }
  
  .ollama-status-text {
    white-space: nowrap;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  
  .ollama-status-time {
    color: #6b7280;
    font-size: 11px;
    font-weight: 600;
    margin-left: 4px;
    padding: 2px 6px;
    background: rgba(0, 0, 0, 0.04);
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .ollama-status-time.slow {
    color: #dc2626;
    background: rgba(239, 68, 68, 0.1);
  }
  
  .ollama-status-time.fast {
    color: #059669;
    background: rgba(16, 185, 129, 0.1);
  }
  
  .ollama-status-time .instant {
    color: #8b5cf6;
    font-weight: 700;
  }
  
  .ollama-status-count {
    position: absolute;
    top: -6px;
    right: -6px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .ollama-status-details {
    font-size: 10px;
    color: #9ca3af;
    margin-left: 4px;
    opacity: 0.8;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .cache-hit-animation {
    position: absolute;
    top: -20px;
    right: 10px;
    font-size: 20px;
    animation: cacheHit 1s ease-out forwards;
  }
  
  @keyframes cacheHit {
    0% {
      transform: translateY(0) scale(0.5);
      opacity: 0;
    }
    50% {
      transform: translateY(-10px) scale(1.2);
      opacity: 1;
    }
    100% {
      transform: translateY(-20px) scale(0.8);
      opacity: 0;
    }
  }
  
  @keyframes statusChange {
    0% {
      transform: translateY(-50%) scale(0.95);
    }
    50% {
      transform: translateY(-50%) scale(1.02);
    }
    100% {
      transform: translateY(-50%) scale(1);
    }
  }
  
  /* Mode compact pour les petits inputs */
  .ollama-status.compact {
    padding: 4px 8px;
    gap: 4px;
  }
  
  .ollama-status.compact .ollama-status-icon {
    width: 10px;
    height: 10px;
  }
  
  .ollama-status.compact .ollama-status-text {
    font-size: 10px;
  }
  
  .ollama-status.compact .ollama-status-details {
    display: none;
  }
  
  /* Hover pour voir plus de détails */
  .ollama-status:hover {
    pointer-events: auto;
    cursor: default;
    transform: translateY(-50%) scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .ollama-status:hover .ollama-status-details {
    display: block;
    position: absolute;
    top: 100%;
    right: 0;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    margin-top: 4px;
    font-size: 11px;
    white-space: nowrap;
    z-index: 10002;
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
  
  .correction-overlay {
    pointer-events: none !important;
    user-select: none !important;
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
`;
document.head.appendChild(style);

// Nettoyer les caches périodiquement
setInterval(() => {
  const now = Date.now();
  
  // Nettoyer le cache de correction
  for (const [key, value] of correctionCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      correctionCache.delete(key);
    }
  }
  
  // Afficher les stats dans la console (pour debug)
  const totalElements = elementStates.size;
  let totalCorrections = 0;
  let totalCacheHits = 0;
  let avgTime = 0;
  
  for (const state of elementStates.values()) {
    totalCorrections += state.performanceStats.correctionCount;
    totalCacheHits += state.performanceStats.cacheHits;
    if (state.performanceStats.averageTime) {
      avgTime += state.performanceStats.averageTime;
    }
  }
  
  if (totalElements > 0) {
    console.log(`📊 Stats Ollama: ${totalCorrections} corrections, ${totalCacheHits} cache hits, temps moyen: ${Math.round(avgTime / totalElements)}ms`);
  }
}, 60000); // Toutes les minutes

// Démarrer l'observation
observeAllEditableElements();
mutationObserver.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['contenteditable', 'role']
});

// Réobserver périodiquement pour les éléments créés dynamiquement
setInterval(() => {
  observeAllEditableElements();
}, 2000);