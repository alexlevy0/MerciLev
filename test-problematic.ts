// Test rapide pour les cas problématiques
import * as http from 'http';
import { CORRECTION_SYSTEM_PROMPT, MODEL_NAME, OLLAMA_ENDPOINT, setModel, MODELS, getModelOptions } from './ollama-prompt.ts';

// Utiliser le modèle spécifié par l'environnement si disponible
if (process.env.OLLAMA_MODEL) {
  const envModel = process.env.OLLAMA_MODEL;
  if (Object.values(MODELS).includes(envModel as any)) {
    setModel(envModel as any);
    console.log(`📌 Utilisation du modèle: ${envModel}\n`);
  }
}

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

// Configuration des retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 500; // ms entre les retries

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

  const responseTimes: number[] = [];
  let passed = 0;
  let failed = 0;

  for (const test of problematicCases) {
    console.log(`📝 ${test.description}`);
    console.log(`   Input: "${test.input}"`);
    
    let attempts = 0;
    let success = false;
    let lastResult = '';
    let lastTime = 0;
    
    while (attempts < MAX_RETRIES && !success) {
      attempts++;
      
      try {
        const body = JSON.stringify({
          model: MODEL_NAME,
          system: system,
          prompt: `Phrase avec des fautes: "${test.input}"\n\nCorrige TOUTES les fautes. ATTENTION: Pour "C'est" + nom pluriel, corrige en "Ces". Ne change JAMAIS "on" en "nous".`,
          stream: false,
          options: getModelOptions(MODEL_NAME)
        });

        const startTime = performance.now();
        const data = await makeRequest(body);
        const endTime = performance.now();
        lastTime = endTime - startTime;
        lastResult = data.response.trim();
        
        if (lastResult === test.expected) {
          success = true;
          responseTimes.push(lastTime);
          console.log(`   ✅ Résultat: "${lastResult}"`);
          console.log(`   ⏱️  Temps: ${lastTime.toFixed(0)}ms`);
          if (attempts > 1) {
            console.log(`   🔄 Réussi après ${attempts} essai(s)`);
          }
          passed++;
        } else if (attempts < MAX_RETRIES) {
          console.log(`   🔄 Essai ${attempts}/${MAX_RETRIES} échoué, nouvelle tentative...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      } catch (error) {
        lastResult = `Erreur: ${error}`;
        if (attempts < MAX_RETRIES) {
          console.log(`   🔄 Essai ${attempts}/${MAX_RETRIES} - Erreur, nouvelle tentative...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }
    
    if (!success) {
      responseTimes.push(lastTime);
      console.log(`   ❌ Résultat: "${lastResult}"`);
      console.log(`   ❌ Attendu:  "${test.expected}"`);
      console.log(`   ⏱️  Temps: ${lastTime.toFixed(0)}ms`);
      console.log(`   ❌ ÉCHEC après ${MAX_RETRIES} essais`);
      failed++;
    }
    
    console.log('');
  }
  
  // Afficher les statistiques
  const avgTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  const minTime = responseTimes.length > 0 
    ? Math.min(...responseTimes) 
    : 0;
  const maxTime = responseTimes.length > 0 
    ? Math.max(...responseTimes) 
    : 0;
  
  console.log('\n📊 Résumé:');
  console.log(`   ✅ Réussis: ${passed}/${problematicCases.length}`);
  console.log(`   ❌ Échoués: ${failed}/${problematicCases.length}`);
  
  console.log('\n⏱️  Statistiques de temps de réponse:');
  console.log(`   🔹 Moyenne: ${avgTime.toFixed(0)}ms`);
  console.log(`   🔸 Minimum: ${minTime.toFixed(0)}ms`);
  console.log(`   🔺 Maximum: ${maxTime.toFixed(0)}ms`);
}

// Exécuter
testProblematicCases().catch(console.error);