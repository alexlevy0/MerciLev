#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { CORRECTION_SYSTEM_PROMPT, MODELS, OLLAMA_ENDPOINT } from './ollama-prompt.ts';

interface TestCase {
  input: string;
  expected: string;
  description: string;
}

interface ModelResult {
  model: string;
  passed: number;
  failed: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  results: TestResult[];
}

interface TestResult {
  test: TestCase;
  output: string;
  success: boolean;
  time: number;
}

// Importer tous les tests depuis test-ollama.ts
const allTestCases: TestCase[] = [
  {
    input: "Je ne suis pas allé chercher mon chien mai je suis allé chercher mon ami ALex !",
    expected: "Je ne suis pas allé chercher mon chien mais je suis allé chercher mon ami Alex !",
    description: "Correction de 'mai' en 'mais' et 'ALex' en 'Alex'"
  },
  {
    input: "Il a manger une pomme vert dans le jardin.",
    expected: "Il a mangé une pomme verte dans le jardin.",
    description: "Participe passé et accord de l'adjectif"
  },
  {
    input: "Les enfants joues dans la cours de l'ecole.",
    expected: "Les enfants jouent dans la cour de l'école.",
    description: "Conjugaison pluriel et orthographe"
  },
  {
    input: "Sa va bien, et toi ? J'ai été a la plage hier.",
    expected: "Ça va bien, et toi ? J'ai été à la plage hier.",
    description: "Homophones sa/ça et a/à"
  },
  {
    input: "Elle est parti se matin pour aller au travaille.",
    expected: "Elle est partie ce matin pour aller au travail.",
    description: "Accord participe passé, se/ce, travaille/travail"
  },
  {
    input: "J'ai vue un film hier soir avec mais amis.",
    expected: "J'ai vu un film hier soir avec mes amis.",
    description: "Participe passé sans accord, mais/mes"
  },
  {
    input: "Ils ont décidés de partir en vacance.",
    expected: "Ils ont décidé de partir en vacances.",
    description: "Participe passé avec avoir, vacance/vacances"
  },
  {
    input: "C'est temps sont difficile pour tout le monde.",
    expected: "Ces temps sont difficiles pour tout le monde.",
    description: "C'est/Ces et accord de l'adjectif"
  },
  {
    input: "Il faut que je finit mon devoir pour demain.",
    expected: "Il faut que je finisse mon devoir pour demain.",
    description: "Subjonctif après 'il faut que'"
  },
  {
    input: "Les phaute d'ortographe sont trop nombreuse dans se texte.",
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
    input: "On a bien travaillé aujourd'hui.",
    expected: "On a bien travaillé aujourd'hui.",
    description: "Phrase avec 'on' déjà correcte"
  }
];

// Fonction pour appeler Ollama avec un modèle spécifique
async function callOllamaWithModel(sentence: string, model: string): Promise<string> {
  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        system: CORRECTION_SYSTEM_PROMPT,
        prompt: `Phrase avec des fautes: "${sentence}"\n\nCorrige TOUTES les fautes.`,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    throw error;
  }
}

// Normaliser les chaînes pour la comparaison
function normalizeString(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

// Configuration des retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 500; // ms entre les retries

// Tester un cas avec retry
async function testWithRetry(test: TestCase, modelName: string, maxRetries: number = MAX_RETRIES): Promise<TestResult> {
  let lastOutput = '';
  let lastTime = 0;
  let attempts = 0;
  
  while (attempts < maxRetries) {
    attempts++;
    
    try {
      const startTime = performance.now();
      const output = await callOllamaWithModel(test.input, modelName);
      const endTime = performance.now();
      lastTime = endTime - startTime;
      lastOutput = output;
      
      const normalizedOutput = normalizeString(output);
      const normalizedExpected = normalizeString(test.expected);
      const success = normalizedOutput === normalizedExpected;
      
      if (success) {
        return { test, output, success, time: lastTime };
      }
      
      // Si échec et pas le dernier essai, attendre avant de réessayer
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
      
    } catch (error) {
      lastOutput = `Erreur: ${error}`;
      // Si erreur et pas le dernier essai, attendre avant de réessayer
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }
  
  // Après tous les essais, retourner l'échec
  return { test, output: lastOutput, success: false, time: lastTime };
}

// Tester un modèle
async function testModel(modelName: string): Promise<ModelResult> {
  console.log(`\n🤖 Test du modèle: ${modelName}`);
  console.log('─'.repeat(60));
  console.log(`   ${allTestCases.length} tests à exécuter (avec retry automatique)...\n`);
  
  const results: TestResult[] = [];
  const times: number[] = [];
  let passed = 0;
  let failed = 0;
  let testNumber = 0;
  let totalRetries = 0;

  for (const test of allTestCases) {
    testNumber++;
    process.stdout.write(`  [${testNumber.toString().padStart(2, '0')}/${allTestCases.length}] ${test.description.padEnd(50, '.')} `);
    
    const result = await testWithRetry(test, modelName);
    
    times.push(result.time);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.time.toFixed(0).padStart(4)}ms`);
      passed++;
    } else {
      console.log(`❌ ${result.time.toFixed(0).padStart(4)}ms (après ${MAX_RETRIES} essais)`);
      failed++;
    }
    
    // Pause plus courte entre les tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = times.length > 0 ? totalTime / times.length : 0;
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;

  return {
    model: modelName,
    passed,
    failed,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    results
  };
}

// Afficher les résultats détaillés
function displayDetailedResults(results: ModelResult[]) {
  console.log('\n\n📊 RÉSULTATS DÉTAILLÉS');
  console.log('═'.repeat(80));

  // Analyser les différences entre modèles
  const testCount = allTestCases.length;
  const modelTests = new Map<string, Set<string>>();
  
  for (const modelResult of results) {
    const passedTests = new Set(
      modelResult.results
        .filter(r => r.success)
        .map(r => r.test.description)
    );
    modelTests.set(modelResult.model, passedTests);
  }

  // Trouver les tests réussis par tous les modèles
  const allPassed = allTestCases.filter(test => 
    Array.from(modelTests.values()).every(tests => tests.has(test.description))
  );

  // Trouver les tests échoués par tous les modèles
  const allFailed = allTestCases.filter(test => 
    Array.from(modelTests.values()).every(tests => !tests.has(test.description))
  );

  console.log(`\n📊 Résumé des tests (${testCount} tests au total):`);
  console.log(`   ✅ Réussis par tous: ${allPassed.length} tests`);
  console.log(`   ❌ Échoués par tous: ${allFailed.length} tests`);
  console.log(`   ⚡ Différences entre modèles: ${testCount - allPassed.length - allFailed.length} tests`);

  // Afficher les échecs communs
  if (allFailed.length > 0) {
    console.log('\n❌ Tests échoués par TOUS les modèles:');
    for (const test of allFailed) {
      console.log(`   - ${test.description}`);
    }
  }

  // Afficher les différences entre modèles
  console.log('\n🔄 Différences entre modèles:');
  for (const test of allTestCases) {
    const passedBy = results
      .filter(r => r.results.find(t => t.test.description === test.description)?.success)
      .map(r => r.model);
    
    if (passedBy.length > 0 && passedBy.length < results.length) {
      const failedBy = results
        .filter(r => !r.results.find(t => t.test.description === test.description)?.success)
        .map(r => r.model);
      
      console.log(`\n   "${test.description}"`);
      console.log(`     ✅ Réussi par: ${passedBy.join(', ')}`);
      console.log(`     ❌ Échoué par: ${failedBy.join(', ')}`);
    }
  }
}

// Afficher la comparaison
function displayComparison(results: ModelResult[]) {
  console.log('\n\n🏆 COMPARAISON DES MODÈLES');
  console.log('═'.repeat(80));
  
  // Tableau de comparaison
  console.log('\n📈 Performance et Précision:\n');
  console.log('┌─────────────────────┬────────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Modèle              │ Score      │ Moy (ms) │ Min (ms) │ Max (ms) │ Total(s) │');
  console.log('├─────────────────────┼────────────┼──────────┼──────────┼──────────┼──────────┤');
  
  for (const result of results) {
    const total = result.passed + result.failed;
    const score = `${result.passed}/${total}`;
    const scorePercent = ((result.passed / total) * 100).toFixed(1);
    const scoreDisplay = `${score.padEnd(6)} (${scorePercent}%)`;
    
    console.log(
      `│ ${result.model.padEnd(19)} │ ${scoreDisplay.padEnd(10)} │ ${
        result.avgTime.toFixed(0).padStart(8)
      } │ ${
        result.minTime.toFixed(0).padStart(8)
      } │ ${
        result.maxTime.toFixed(0).padStart(8)
      } │ ${
        (result.totalTime / 1000).toFixed(1).padStart(8)
      } │`
    );
  }
  console.log('└─────────────────────┴────────────┴──────────┴──────────┴──────────┴──────────┘');

  // Déterminer le meilleur modèle
  const bestAccuracy = results.reduce((best, current) => 
    (current.passed / (current.passed + current.failed)) > (best.passed / (best.passed + best.failed)) 
    ? current : best
  );
  
  const bestSpeed = results.reduce((best, current) => 
    current.avgTime < best.avgTime ? current : best
  );

  console.log('\n🎯 Analyse:');
  console.log(`   🥇 Meilleure précision: ${bestAccuracy.model} (${((bestAccuracy.passed / (bestAccuracy.passed + bestAccuracy.failed)) * 100).toFixed(1)}%)`);
  console.log(`   ⚡ Plus rapide: ${bestSpeed.model} (${bestSpeed.avgTime.toFixed(0)}ms en moyenne)`);
  
  // Différence de vitesse
  const speedDiff = results.map(r => r.avgTime).sort((a, b) => a - b);
  if (speedDiff.length > 1) {
    const speedImprovement = ((speedDiff[1] - speedDiff[0]) / speedDiff[1] * 100).toFixed(1);
    console.log(`   📊 Différence de vitesse: ${speedImprovement}% plus rapide`);
  }
  
  // Recommandation
  console.log('\n💡 Recommandation:');
  if (bestAccuracy.model === bestSpeed.model) {
    console.log(`   ➡️  ${bestAccuracy.model} est le meilleur choix (précision ET vitesse)`);
  } else {
    const accuracyDiff = Math.abs(
      (bestAccuracy.passed / (bestAccuracy.passed + bestAccuracy.failed)) - 
      (bestSpeed.passed / (bestSpeed.passed + bestSpeed.failed))
    ) * 100;
    
    if (accuracyDiff < 10) {
      console.log(`   ➡️  ${bestSpeed.model} recommandé (vitesse avec précision similaire)`);
    } else {
      console.log(`   ➡️  ${bestAccuracy.model} recommandé pour la précision`);
      console.log(`   ➡️  ${bestSpeed.model} si la vitesse est prioritaire`);
    }
  }
}

// Vérifier la connexion
async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/');
    return response.ok;
  } catch {
    return false;
  }
}

// Main
async function main() {
  console.log('🔬 Comparaison des modèles Ollama pour la correction française');
  console.log('═'.repeat(60));

  // Vérifier Ollama
  if (!await checkConnection()) {
    console.error('\n❌ Ollama n\'est pas démarré !');
    console.error('   Lancez-le avec : OLLAMA_ORIGINS=\'*\' ollama serve');
    process.exit(1);
  }

  // Tester chaque modèle
  const results: ModelResult[] = [];
  
  for (const [key, modelName] of Object.entries(MODELS)) {
    try {
      const result = await testModel(modelName);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Erreur avec le modèle ${modelName}: ${error}`);
    }
  }

  // Afficher les résultats
  displayDetailedResults(results);
  displayComparison(results);
}

// Exécuter
main().catch(console.error);