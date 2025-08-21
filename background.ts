// FICHIER: background.ts
interface CorrectionRequest {
  sentence: string;
  fullText: string;
  cursorPosition: number;
  sentenceStart: number;
  tabId: number;
  inputId: string;
}

interface CorrectionResponse {
  correctedSentence: string;
  originalSentence: string;
  error?: string;
  corrections: Array<{start: number, end: number, original: string, corrected: string}>;
}

interface CompletionRequest {
  partialWord: string;
  fullText: string;
  position: number;
}

interface CompletionResponse {
  suggestions: string[];
  error?: string;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'gemma3n:e4b';

// État de l'extension
let lastError: string | null = null;

// Fonction pour appeler Ollama pour la correction
async function callOllama(sentence: string, fullText: string, cursorPosition: number): Promise<string> {
  const system = `Tu es un correcteur expert en français. Tu DOIS corriger TOUTES les erreurs.

TYPES D'ERREURS À CORRIGER OBLIGATOIREMENT:
1. ESPACES MANQUANTS: Ajoute les espaces manquants (Jene→Je ne, ilfaut→il faut, c'estpas→ce n'est pas)
2. ORTHOGRAPHE: fautes de frappe, lettres manquantes (phaute→faute, bonjoure→bonjour)
3. GRAMMAIRE: structure des phrases, ordre des mots
4. CONJUGAISON: temps, modes, personnes (je mange→je mange, ils manges→ils mangent)
5. ACCORDS: 
   - Genre/nombre des adjectifs (une pomme vert→une pomme verte)
   - Participes passés (elle est parti→elle est partie)
   - Déterminants (un femme→une femme)
   - Singulier/pluriel (nouvelle ami→nouveaux amis)
6. SYNTAXE: prépositions, articles (aller à le→aller au)
7. TYPOGRAPHIE: espaces, apostrophes (l'homme→l'homme)
8. HOMOPHONES: Corrige OBLIGATOIREMENT les confusions entre:
   - mai/mais (mai = mois, mais = conjonction)
   - a/à (a = verbe avoir, à = préposition)
   - sa/ça (sa = possessif, ça = cela)
   - et/est (et = conjonction, est = verbe être)
   - se/ce (se = pronom, ce = démonstratif)
   - ses/ces/c'est
   - ou/où (ou = choix, où = lieu)
   - la/là (la = article, là = lieu)
   - leur/leurs
   - on/ont
   - son/sont

RÈGLES STRICTES:
- Retourne UNIQUEMENT la phrase corrigée, RIEN d'autre
- NE JAMAIS changer "on" en "nous" (les deux sont corrects)
- NE JAMAIS ajouter ou supprimer des mots
- NE JAMAIS changer la structure de la phrase
- Pour C'est/Ces : "C'est" + nom pluriel = TOUJOURS "Ces"
- Si la phrase est déjà correcte, la retourner EXACTEMENT comme elle est
- Garde le sens original et le style informel/formel
- Sois TRÈS attentif aux homophones`;
  
  const prompt = `Contexte: "${fullText}"

Phrase avec des fautes: "${sentence}"

Corrige TOUTES les fautes (orthographe, grammaire, conjugaison, accords, HOMOPHONES). 
ATTENTION SPÉCIALE aux homophones comme mai/mais, a/à, sa/ça, etc.
Retourne la phrase corrigée.`;

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        system: system,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { error: errorText };
      }
      
      // Détection d'erreurs spécifiques
      if (response.status === 404 || errorJson.error?.includes('model') || errorJson.error?.includes('not found')) {
        throw new Error('Model not found');
      }
      if (response.status === 403) {
        throw new Error('Access forbidden (403)');
      }
      if (response.status === 401) {
        throw new Error('Authentication required (401)');
      }
      if (response.status === 500) {
        throw new Error('Ollama server error (500)');
      }
      if (response.status === 502) {
        throw new Error('Bad gateway (502)');
      }
      if (response.status === 503) {
        throw new Error('Service unavailable (503)');
      }
      throw new Error(`HTTP ${response.status}: ${errorJson.error || errorText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response.trim();
  } catch (error: any) {
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      throw new Error('Ollama unreachable');
    }
    throw error;
  }
}

// Analyser les différences entre deux phrases pour identifier les corrections
function analyzeDifferences(original: string, corrected: string): Array<{start: number, end: number, original: string, corrected: string}> {
  const corrections: Array<{start: number, end: number, original: string, corrected: string}> = [];
  
  // Algorithme simple de comparaison mot par mot
  const originalWords = original.split(/(\s+)/);
  const correctedWords = corrected.split(/(\s+)/);
  
  let originalIndex = 0;
  let correctedIndex = 0;
  let charPosition = 0;
  
  while (originalIndex < originalWords.length && correctedIndex < correctedWords.length) {
    if (originalWords[originalIndex] === correctedWords[correctedIndex]) {
      // Pas de changement
      charPosition += originalWords[originalIndex].length;
      originalIndex++;
      correctedIndex++;
    } else {
      // Trouver la fin de la différence
      let endOriginal = originalIndex;
      let endCorrected = correctedIndex;
      
      // Chercher le prochain mot identique
      let found = false;
      for (let i = originalIndex; i < originalWords.length && !found; i++) {
        for (let j = correctedIndex; j < correctedWords.length && !found; j++) {
          if (originalWords[i] === correctedWords[j] && originalWords[i].trim() !== '') {
            endOriginal = i;
            endCorrected = j;
            found = true;
          }
        }
      }
      
      if (!found) {
        endOriginal = originalWords.length;
        endCorrected = correctedWords.length;
      }
      
      // Calculer la correction
      const originalPart = originalWords.slice(originalIndex, endOriginal).join('');
      const correctedPart = correctedWords.slice(correctedIndex, endCorrected).join('');
      
      if (originalPart.trim() || correctedPart.trim()) {
        corrections.push({
          start: charPosition,
          end: charPosition + originalPart.length,
          original: originalPart,
          corrected: correctedPart
        });
      }
      
      charPosition += originalPart.length;
      originalIndex = endOriginal;
      correctedIndex = endCorrected;
    }
  }
  
  return corrections;
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

// Fonction pour obtenir des suggestions d'autocomplétion
async function getCompletions(partialWord: string, fullText: string, position: number): Promise<string[]> {
  const system = `Tu es un assistant d'autocomplétion expert en français.

CAPACITÉS:
1. Complète les mots commencés
2. Corrige les fautes d'orthographe (phaute→faute)
3. Suggère le bon accord (vert→verte si féminin)
4. Propose la bonne conjugaison (mange→mangent si pluriel)
5. Corrige les erreurs courantes (sa/ça, et/est, a/à)

RÈGLES:
- Retourne 1-3 suggestions séparées par des virgules
- Priorise la correction des fautes évidentes
- Tiens compte du contexte grammatical
- Format: mot1, mot2, mot3`;
  
  // Extraire plus de contexte autour du mot
  const contextStart = Math.max(0, position - 50);
  const contextEnd = Math.min(fullText.length, position + 30);
  const localContext = fullText.substring(contextStart, contextEnd);
  
  const prompt = `Contexte local: "${localContext}"
Mot actuel: "${partialWord}"

Suggère la complétion ou correction la plus probable en tenant compte de la grammaire.`;

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        system: system,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: OllamaResponse = await response.json();
    const rawSuggestions = data.response.trim()
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Filtrer et formater les suggestions
    const suggestions: string[] = [];
    for (const suggestion of rawSuggestions) {
      if (suggestion.startsWith(partialWord)) {
        // Suggestion normale qui commence par le mot partiel
        suggestions.push(suggestion);
      } else if (suggestion.length > partialWord.length) {
        // Peut-être une correction - vérifier si c'est proche
        const commonPrefix = getCommonPrefix(partialWord, suggestion);
        if (commonPrefix.length >= Math.max(1, partialWord.length - 2)) {
          // Si la suggestion corrige une faute de frappe
          suggestions.push(suggestion);
        }
      }
    }
    
    return suggestions.slice(0, 3);
  } catch (error: any) {
    console.error('Completion error:', error);
    return [];
  }
}

// Test de connexion à Ollama
async function testConnection(): Promise<{ success: boolean; error?: string; details?: string }> {
  try {
    // Test de base de connexion à Ollama
    const response = await fetch('http://localhost:11434/', {
      method: 'GET'
    });
    
    if (!response.ok) {
      let error = 'Ollama error';
      let details = '';
      
      if (response.status === 403) {
        error = 'Access forbidden (403)';
        details = 'Ollama bloque les requêtes de l\'extension. Redémarrez Ollama avec : OLLAMA_ORIGINS="*" ollama serve';
      } else if (response.status === 404) {
        error = 'Endpoint not found (404)';
        details = 'L\'endpoint Ollama n\'est pas trouvé. Vérifiez que le service est bien démarré.';
      } else {
        error = `HTTP ${response.status}`;
        details = `Erreur serveur avec le code ${response.status}`;
      }
      
      lastError = error;
      await updateBadge(true);
      return { success: false, error, details };
    }
    
    // Test si le modèle est disponible
    try {
      const testResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          prompt: 'test',
          stream: false
        })
      });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        let errorJson: any;
        try {
          errorJson = JSON.parse(errorText);
        } catch {
          errorJson = { error: errorText };
        }
        
        if (testResponse.status === 404 || errorJson.error?.includes('model') || errorJson.error?.includes('not found')) {
          lastError = 'Model not found';
          await updateBadge(true);
          return { 
            success: false, 
            error: 'Model not found',
            details: `Le modèle ${MODEL_NAME} n'est pas installé. Exécutez : ollama pull ${MODEL_NAME}`
          };
        }
        
        if (testResponse.status === 403) {
          lastError = 'Access forbidden (403)';
          await updateBadge(true);
          return { 
            success: false, 
            error: 'Access forbidden (403)',
            details: 'Ollama bloque les requêtes de l\'extension. Redémarrez Ollama avec : OLLAMA_ORIGINS="*" ollama serve'
          };
        }
      }
    } catch (e) {
      // Ignorer les erreurs du test de modèle
    }
    
    lastError = null;
    await updateBadge(false);
    return { success: true };
  } catch (e: any) {
    const error = 'Ollama unreachable';
    const details = 'Impossible de se connecter à Ollama. Assurez-vous qu\'il est démarré avec : ollama serve';
    lastError = error;
    await updateBadge(true);
    return { success: false, error, details };
  }
}

// Mise à jour du badge de l'icône
async function updateBadge(hasError: boolean) {
  if (hasError) {
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

// Obtenir les détails de l'erreur
function getErrorDetails(error: string | null): string {
  if (!error) return '';
  
  const errorDetails: Record<string, string> = {
    'Ollama unreachable': 'Impossible de se connecter à Ollama. Assurez-vous qu\'il est démarré avec : ollama serve',
    'Model not found': `Le modèle ${MODEL_NAME} n'est pas installé. Exécutez : ollama pull ${MODEL_NAME}`,
    'Access forbidden (403)': 'Ollama bloque les requêtes de l\'extension. Redémarrez Ollama avec : OLLAMA_ORIGINS="*" ollama serve',
    'Authentication required (401)': 'Authentification requise pour accéder à Ollama.',
    'Ollama server error (500)': 'Erreur interne du serveur Ollama.',
    'Bad gateway (502)': 'Problème de passerelle avec Ollama.',
    'Service unavailable (503)': 'Le service Ollama est temporairement indisponible.'
  };
  
  return errorDetails[error] || error;
}

// Gestionnaire de messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'correct-word') {
    const correctionRequest = request as CorrectionRequest & { type: string };
    
    callOllama(
      correctionRequest.sentence,
      correctionRequest.fullText,
      correctionRequest.cursorPosition
    )
      .then(correctedSentence => {
        lastError = null;
        updateBadge(false);
        
        // Analyser les différences
        const corrections = analyzeDifferences(correctionRequest.sentence, correctedSentence);
        
        sendResponse({
          correctedSentence,
          originalSentence: correctionRequest.sentence,
          corrections
        } as CorrectionResponse);
      })
      .catch(error => {
        lastError = error.message;
        updateBadge(true);
        sendResponse({
          correctedSentence: correctionRequest.sentence,
          originalSentence: correctionRequest.sentence,
          error: error.message,
          corrections: []
        } as CorrectionResponse);
      });
    
    return true; // Indique que la réponse sera asynchrone
  }
  
  if (request.type === 'get-status') {
    sendResponse({
      status: lastError || 'OK',
      hasError: !!lastError,
      details: getErrorDetails(lastError)
    });
    return false;
  }
  
  if (request.type === 'test-connection') {
    testConnection().then(result => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.type === 'get-completions') {
    const completionRequest = request as CompletionRequest & { type: string };
    
    getCompletions(
      completionRequest.partialWord,
      completionRequest.fullText,
      completionRequest.position
    )
      .then(suggestions => {
        sendResponse({
          suggestions,
          error: undefined
        } as CompletionResponse);
      })
      .catch(error => {
        sendResponse({
          suggestions: [],
          error: error.message
        } as CompletionResponse);
      });
    
    return true;
  }
  
  return false;
});

// Test initial de connexion au démarrage
chrome.runtime.onInstalled.addListener(() => {
  testConnection();
});

// Test périodique toutes les 30 secondes
setInterval(() => {
  testConnection();
}, 30000);