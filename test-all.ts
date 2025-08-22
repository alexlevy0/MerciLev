#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { CORRECTION_SYSTEM_PROMPT, MODELS, OLLAMA_ENDPOINT, ModelName, setModel } from './ollama-prompt.ts';
import * as http from 'http';
import { performance } from 'perf_hooks';

// Configuration
const RUN_COMPARISON = process.argv.includes('--compare');
const SINGLE_MODEL = process.argv.find(arg => arg.startsWith('--model='))?.split('=')[1];
const MAX_RETRIES = 3;
const RETRY_DELAY = 500;

// Tous les tests
const allTests = [
  {
    input: "Je ne suis pas allé chercher mon chien mai je suis allé chercher mon ami ALex !",
    expected: "Je ne suis pas allé chercher mon chien mais je suis allé chercher mon ami Alex !",
    description: "Correction de 'mai' en 'mais' et 'ALex' en 'Alex'"
  },
  {
    input: "Elle a mangé une pomme vert et des fraises délicieux.",
    expected: "Elle a mangé une pomme verte et des fraises délicieuses.",
    description: "Participe passé et accord de l'adjectif"
  },
  {
    input: "Les enfants joues dans le jardin avec leur amis.",
    expected: "Les enfants jouent dans le jardin avec leurs amis.",
    description: "Conjugaison pluriel et orthographe"
  },
  {
    input: "Sa va bien, et toi ? J'ai été a la plage hier.",
    expected: "Ça va bien, et toi ? J'ai été à la plage hier.",
    description: "Homophones sa/ça et a/à"
  },
  {
    input: "Il faut qu'elle se dépêche pour aller au travaille.",
    expected: "Il faut qu'elle se dépêche pour aller au travail.",
    description: "Accord participe passé, se/ce, travaille/travail"
  },
  {
    input: "J'ai fais mes devoirs mais j'ai oublié mais cahiers.",
    expected: "J'ai fait mes devoirs mais j'ai oublié mes cahiers.",
    description: "Participe passé sans accord, mais/mes"
  },
  {
    input: "Nous avons passé de bonnes vacance cet été.",
    expected: "Nous avons passé de bonnes vacances cet été.",
    description: "Participe passé avec avoir, vacance/vacances"
  },
  {
    input: "C'est temps sont difficile pour tout le monde.",
    expected: "Ces temps sont difficiles pour tout le monde.",
    description: "C'est/Ces et accord de l'adjectif"
  },
  {
    input: "Il faut que je fasse attention et que tu fait pareil.",
    expected: "Il faut que je fasse attention et que tu fasses pareil.",
    description: "Subjonctif après 'il faut que'"
  },
  {
    input: "Les phaute d'ortographe sont trop nombreux dans se texte.",
    expected: "Les fautes d'orthographe sont trop nombreuses dans ce texte.",
    description: "Fautes multiples : phaute, accord adjectif, se/ce"
  },
  {
    input: "J'ai pas pu venir parce-que j'étais malade.",
    expected: "Je n'ai pas pu venir parce que j'étais malade.",
    description: "Négation et parce que"
  },
  {
    input: "Ils ce sont trompé de chemin pour allez au parc.",
    expected: "Ils se sont trompés de chemin pour aller au parc.",
    description: "ce/se, accord participe passé, infinitif"
  },
  {
    input: "Tout les jours, je vais a l'école en vélo.",
    expected: "Tous les jours, je vais à l'école en vélo.",
    description: "Tout/Tous et a/à"
  },
  {
    input: "Il y a beaucoup de monde, on n'a pas de place.",
    expected: "Il y a beaucoup de monde, on n'a pas de place.",
    description: "Phrase déjà correcte (test de non-modification)"
  },
  {
    input: "Quand est-ce que tu va venir me voir ?",
    expected: "Quand est-ce que tu vas venir me voir ?",
    description: "Conjugaison 2e personne singulier"
  },
  {
    input: "Jene vais pas chercher de nouvelle ami.",
    expected: "Je ne vais pas chercher de nouveaux amis.",
    description: "Espaces manquants, accord adjectif et nom"
  },
  {
    input: "Ilfaut que jetravaille plus dur.",
    expected: "Il faut que je travaille plus dur.",
    description: "Multiples espaces manquants"
  },
  {
    input: "C'estpas facile d'apprendre lefrançais.",
    expected: "Ce n'est pas facile d'apprendre le français.",
    description: "Espaces manquants et négation"
  },
  {
    input: "C'est jours sont importants pour moi.",
    expected: "Ces jours sont importants pour moi.",
    description: "C'est + nom pluriel = Ces (cas simple)"
  },
  {
    input: "On va au cinéma ce soir, on se retrouve à 20h.",
    expected: "On va au cinéma ce soir, on se retrouve à 20h.",
    description: "Phrase avec 'on' déjà correcte"
  }
];

// Fonction pour appeler Ollama
function callOllama(sentence: string, model: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: model,
      system: CORRECTION_SYSTEM_PROMPT,
      prompt: `Phrase à corriger: "${sentence}"`,
      stream: false
    });

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
          const response = JSON.parse(data);
          resolve(response.response.trim());
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

// Fonction pour normaliser les chaînes
function normalizeString(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

// Test avec retry
async function testWithRetry(test: any, model: string): Promise<{success: boolean, result: string, time: number, attempts: number}> {
  let lastResult = '';
  let lastTime = 0;
  let attempts = 0;
  
  while (attempts < MAX_RETRIES) {
    attempts++;
    
    try {
      const startTime = performance.now();
      const result = await callOllama(test.input, model);
      const endTime = performance.now();
      lastTime = endTime - startTime;
      lastResult = result;
      
      const normalizedResult = normalizeString(result);
      const normalizedExpected = normalizeString(test.expected);
      
      if (normalizedResult === normalizedExpected) {
        return { success: true, result, time: lastTime, attempts };
      }
      
      if (attempts < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
      
    } catch (error) {
      lastResult = `Erreur: ${error}`;
      if (attempts < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  return { success: false, result: lastResult, time: lastTime, attempts };
}

// Tester un modèle
async function testModel(modelName: string, showDetails: boolean = true) {
  if (showDetails) {
    console.log(`\n🤖 Test du modèle: ${modelName}`);
    console.log('─'.repeat(60));
    console.log(`   ${allTests.length} tests à exécuter (avec retry automatique)...\n`);
  }
  
  const results: any[] = [];
  const times: number[] = [];
  let passed = 0;
  let failed = 0;
  let testNumber = 0;

  for (const test of allTests) {
    testNumber++;
    if (showDetails) {
      process.stdout.write(`  [${testNumber.toString().padStart(2, '0')}/${allTests.length}] ${test.description.padEnd(50, '.')} `);
    }
    
    const result = await testWithRetry(test, modelName);
    
    times.push(result.time);
    results.push({ test, ...result });
    
    if (result.success) {
      if (showDetails) {
        console.log(`✅ ${result.time.toFixed(0).padStart(4)}ms`);
      }
      passed++;
    } else {
      if (showDetails) {
        console.log(`❌ ${result.time.toFixed(0).padStart(4)}ms (après ${MAX_RETRIES} essais)`);
      }
      failed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = Math.round(totalTime / times.length);
  const minTime = Math.round(Math.min(...times));
  const maxTime = Math.round(Math.max(...times));

  return {
    modelName,
    passed,
    failed,
    total: allTests.length,
    avgTime,
    minTime,
    maxTime,
    totalTime: Math.round(totalTime / 1000),
    results
  };
}

// Afficher le résumé
function displaySummary(results: any) {
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('═'.repeat(60));
  
  console.log(`\n✅ Tests réussis: ${results.passed}/${results.total}`);
  console.log(`❌ Tests échoués: ${results.failed}/${results.total}`);
  console.log(`📈 Taux de réussite: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  console.log('\n⏱️  Statistiques de temps:');
  console.log(`   🔹 Moyenne: ${results.avgTime}ms`);
  console.log(`   🔸 Minimum: ${results.minTime}ms`);
  console.log(`   🔺 Maximum: ${results.maxTime}ms`);
  console.log(`   ⏰ Total: ${results.totalTime}s`);
  
  // Afficher les échecs
  const failures = results.results.filter((r: any) => !r.success);
  if (failures.length > 0) {
    console.log('\n🔍 Tests échoués après 3 essais:');
    console.log('─'.repeat(60));
    for (const failure of failures) {
      console.log(`\n❌ "${failure.test.description}"`);
      console.log(`   Input:    "${failure.test.input}"`);
      console.log(`   Attendu:  "${failure.test.expected}"`);
      console.log(`   Obtenu:   "${failure.result}"`);
    }
  }
}

// Comparer les modèles
async function compareModels() {
  console.log('\n🏁 COMPARAISON DES MODÈLES');
  console.log('═'.repeat(60));
  
  const results = [];
  
  for (const modelName of Object.values(MODELS)) {
    const result = await testModel(modelName, true);
    results.push(result);
  }
  
  // Afficher la comparaison
  console.log('\n\n🏆 TABLEAU COMPARATIF');
  console.log('═'.repeat(80));
  console.log('\n┌─────────────────────┬────────────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Modèle              │ Score          │ Moy (ms) │ Min (ms) │ Max (ms) │ Total(s) │');
  console.log('├─────────────────────┼────────────────┼──────────┼──────────┼──────────┼──────────┤');
  
  for (const result of results) {
    const score = `${result.passed}/${result.total}`;
    const percentage = ((result.passed / result.total) * 100).toFixed(1);
    console.log(
      `│ ${result.modelName.padEnd(19)} │ ${score.padEnd(6)} (${percentage}%) │ ${result.avgTime.toString().padStart(8)} │ ${result.minTime.toString().padStart(8)} │ ${result.maxTime.toString().padStart(8)} │ ${result.totalTime.toString().padStart(8)} │`
    );
  }
  
  console.log('└─────────────────────┴────────────────┴──────────┴──────────┴──────────┴──────────┘');
  
  // Recommandation
  const bestAccuracy = results.reduce((a, b) => a.passed > b.passed ? a : b);
  const fastest = results.reduce((a, b) => a.avgTime < b.avgTime ? a : b);
  
  console.log('\n💡 Recommandations:');
  console.log(`   🎯 Meilleure précision: ${bestAccuracy.modelName} (${((bestAccuracy.passed / bestAccuracy.total) * 100).toFixed(1)}%)`);
  console.log(`   ⚡ Plus rapide: ${fastest.modelName} (${fastest.avgTime}ms en moyenne)`);
  
  if (bestAccuracy.modelName === fastest.modelName) {
    console.log(`   ✨ ${bestAccuracy.modelName} est le meilleur choix (précis ET rapide)`);
  } else {
    const speedDiff = ((bestAccuracy.avgTime - fastest.avgTime) / bestAccuracy.avgTime * 100).toFixed(1);
    console.log(`   📊 ${fastest.modelName} est ${speedDiff}% plus rapide`);
  }
}

// Vérifier Ollama
async function checkOllama(): Promise<boolean> {
  try {
    await callOllama('test', Object.values(MODELS)[0]);
    return true;
  } catch {
    return false;
  }
}

// Main
async function main() {
  console.log('🧪 Tests de correction française avec Ollama\n');
  
  // Vérifier Ollama
  const ollamaOk = await checkOllama();
  if (!ollamaOk) {
    console.log('❌ Ollama n\'est pas démarré !');
    console.log('   Lancez-le avec : OLLAMA_ORIGINS="*" ollama serve');
    process.exit(1);
  }
  
  // Mode comparaison
  if (RUN_COMPARISON) {
    await compareModels();
    return;
  }
  
  // Mode simple
  const model = SINGLE_MODEL || Object.values(MODELS)[0];
  if (!Object.values(MODELS).includes(model as ModelName)) {
    console.log(`❌ Modèle inconnu: ${model}`);
    console.log(`   Modèles disponibles: ${Object.values(MODELS).join(', ')}`);
    process.exit(1);
  }
  
  setModel(model as ModelName);
  const results = await testModel(model, true);
  displaySummary(results);
}

// Afficher l'aide
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🧪 Script de test unifié pour l'extension de correction française

Usage:
  ./test-all.ts [options]

Options:
  --compare         Compare tous les modèles disponibles
  --model=MODEL     Teste un modèle spécifique (ex: --model=gemma3n:e2b)
  --help, -h        Affiche cette aide

Exemples:
  ./test-all.ts                    # Test avec le modèle par défaut
  ./test-all.ts --compare          # Compare tous les modèles
  ./test-all.ts --model=gemma3n:e2b  # Test avec un modèle spécifique

Modèles disponibles:
  ${Object.values(MODELS).join('\n  ')}
`);
  process.exit(0);
}

main().catch(console.error);