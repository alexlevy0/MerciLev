#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { CORRECTION_SYSTEM_PROMPT, MODEL_NAME, OLLAMA_ENDPOINT, getModelOptions } from './ollama-prompt.ts';
import * as http from 'http';

// Les 3 cas qui échouent
const specificTests = [
  {
    description: "Homophones sa/ça et a/à",
    input: "Sa va bien, et toi ? J'ai été a la plage hier.",
    expected: "Ça va bien, et toi ? J'ai été à la plage hier."
  },
  {
    description: "C'est/Ces et accord de l'adjectif",
    input: "C'est temps sont difficile pour tout le monde.",
    expected: "Ces temps sont difficiles pour tout le monde."
  },
  {
    description: "Espaces manquants, accord adjectif et nom",
    input: "Jene vais pas chercher de nouvelle ami.",
    expected: "Je ne vais pas chercher de nouveaux amis."
  }
];

function makeRequest(body: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function testSpecificCases() {
  console.log('🔬 Test des 3 cas spécifiques avec le nouveau prompt\n');
  console.log('📋 Prompt utilisé:');
  console.log('─'.repeat(60));
  console.log(CORRECTION_SYSTEM_PROMPT.split('\n').slice(0, 20).join('\n'));
  console.log('... [prompt complet avec les nouvelles règles]');
  console.log('─'.repeat(60));
  console.log();

  let passed = 0;
  let failed = 0;

  for (const test of specificTests) {
    console.log(`\n🧪 ${test.description}`);
    console.log(`   Input:    "${test.input}"`);
    console.log(`   Attendu:  "${test.expected}"`);
    
    try {
      const body = JSON.stringify({
        model: MODEL_NAME,
        system: CORRECTION_SYSTEM_PROMPT,
        prompt: `Phrase à corriger: "${test.input}"`,
        stream: false,
        options: getModelOptions(MODEL_NAME)
      });

      console.log('   ⏳ Envoi de la requête...');
      const startTime = performance.now();
      const data = await makeRequest(body);
      const endTime = performance.now();
      const time = endTime - startTime;
      
      const result = data.response.trim();
      console.log(`   Résultat: "${result}"`);
      console.log(`   ⏱️  Temps: ${time.toFixed(0)}ms`);
      
      if (result === test.expected) {
        console.log('   ✅ SUCCÈS !');
        passed++;
      } else {
        console.log('   ❌ ÉCHEC - Le résultat ne correspond pas');
        failed++;
        
        // Analyse détaillée
        console.log('\n   🔍 Analyse:');
        if (test.description.includes("sa/ça")) {
          if (result.includes("Sa va")) {
            console.log('      ⚠️  "Sa" n\'a pas été corrigé en "Ça"');
          }
          if (result.includes("je suis allé")) {
            console.log('      ⚠️  Le verbe a été changé (j\'ai été → je suis allé)');
          }
        }
        if (test.description.includes("C'est/Ces")) {
          if (result.includes("C'est")) {
            console.log('      ⚠️  "C\'est" n\'a pas été corrigé en "Ces"');
          }
          if (!result.includes("difficiles")) {
            console.log('      ⚠️  L\'accord pluriel de "difficile" n\'a pas été fait');
          }
        }
        if (test.description.includes("Espaces manquants")) {
          if (result.includes("Jene")) {
            console.log('      ⚠️  L\'espace manquant n\'a pas été ajouté');
          }
          if (!result.includes("nouveaux amis")) {
            console.log('      ⚠️  L\'accord pluriel n\'a pas été fait correctement');
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ ERREUR: ${error}`);
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Résumé: ${passed}/${specificTests.length} tests réussis`);
  
  if (failed > 0) {
    console.log('\n💡 Le prompt a été amélioré avec:');
    console.log('   - Règles explicites pour ne PAS changer les verbes');
    console.log('   - Exemples spécifiques pour chaque cas');
    console.log('   - Clarification sur les espaces manquants');
    console.log('   - Règles détaillées pour C\'est/Ces');
    console.log('\n🔧 Si les tests échouent encore, vérifiez que:');
    console.log('   1. L\'extension a été rechargée dans Chrome');
    console.log('   2. Ollama utilise bien le nouveau prompt');
  }
}

// Vérifier si Ollama est disponible
async function checkOllama(): Promise<boolean> {
  try {
    await makeRequest(JSON.stringify({
      model: MODEL_NAME,
      prompt: 'test',
      stream: false,
      options: getModelOptions(MODEL_NAME)
    }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const ollamaAvailable = await checkOllama();
  if (!ollamaAvailable) {
    console.log('❌ Ollama n\'est pas disponible !');
    console.log('   Lancez-le avec : OLLAMA_ORIGINS="*" ollama serve');
    process.exit(1);
  }

  await testSpecificCases();
}

main().catch(console.error);