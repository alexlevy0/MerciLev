// Test rapide pour les cas problématiques
const http = require('http');
import { CORRECTION_SYSTEM_PROMPT, MODEL_NAME, OLLAMA_ENDPOINT } from './ollama-prompt';

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

  const system = CORRECTION_SYSTEM_PROMPT;

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