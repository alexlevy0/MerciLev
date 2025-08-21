// Test rapide pour les cas problématiques
const http = require('http');

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'gemma3n:e4b';

// Fonction pour faire une requête HTTP
function makeRequest(body: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = body;
    
    const options = {
      hostname: 'localhost',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res: any) => {
      let data = '';
      
      res.on('data', (chunk: any) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testProblematicCases() {
  const problematicCases = [
    {
      input: "C'est temps sont difficile pour tout le monde.",
      expected: "Ces temps sont difficiles pour tout le monde.",
      description: "C'est/Ces avec accord"
    },
    {
      input: "Il y a beaucoup de monde, on n'a pas de place.",
      expected: "Il y a beaucoup de monde, on n'a pas de place.",
      description: "Phrase déjà correcte avec 'on'"
    },
    {
      input: "C'est jours sont importants pour moi.",
      expected: "Ces jours sont importants pour moi.",
      description: "C'est + nom pluriel = Ces"
    }
  ];

  const system = `Tu es un correcteur expert en français. Tu DOIS corriger TOUTES les erreurs.

TYPES D'ERREURS À CORRIGER OBLIGATOIREMENT:
1. ESPACES MANQUANTS: Ajoute les espaces manquants (Jene→Je ne, ilfaut→il faut)
2. ORTHOGRAPHE: fautes de frappe, lettres manquantes
3. GRAMMAIRE: structure des phrases, ordre des mots
4. CONJUGAISON: temps, modes, personnes
5. ACCORDS: genre/nombre des adjectifs, participes passés
6. SYNTAXE: prépositions, articles
7. TYPOGRAPHIE: espaces, apostrophes
8. HOMOPHONES: mai/mais, a/à, sa/ça, et/est, se/ce, ses/ces/c'est

RÈGLES STRICTES:
- Retourne UNIQUEMENT la phrase corrigée, RIEN d'autre
- NE JAMAIS changer "on" en "nous" (les deux sont corrects)
- NE JAMAIS ajouter ou supprimer des mots
- NE JAMAIS changer la structure de la phrase
- Pour C'est/Ces : "C'est" + nom pluriel = TOUJOURS "Ces"
- Si la phrase est déjà correcte, la retourner EXACTEMENT comme elle est`;

  console.log('🧪 Test des cas problématiques\n');

  for (const test of problematicCases) {
    console.log(`📝 ${test.description}`);
    console.log(`   Input: "${test.input}"`);
    
    try {
      const body = JSON.stringify({
        model: MODEL_NAME,
        system: system,
        prompt: `Phrase avec des fautes: "${test.input}"\n\nCorrige TOUTES les fautes. ATTENTION: Pour "C'est" + nom pluriel, corrige en "Ces". Ne change JAMAIS "on" en "nous".`,
        stream: false
      });

      const data = await makeRequest(body);
      const result = data.response.trim();
      
      if (result === test.expected) {
        console.log(`   ✅ Résultat: "${result}"`);
      } else {
        console.log(`   ❌ Résultat: "${result}"`);
        console.log(`   ❌ Attendu:  "${test.expected}"`);
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${error}`);
    }
    
    console.log('');
  }
}

// Exécuter
testProblematicCases().catch(console.error);