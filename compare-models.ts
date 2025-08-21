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

// Tests de base pour la comparaison
const comparisonTests: TestCase[] = [
  {
    input: "Je ne suis pas allé chercher mon chien mai je suis allé chercher mon ami ALex !",
    expected: "Je ne suis pas allé chercher mon chien mais je suis allé chercher mon ami Alex !",
    description: "Homophones et majuscules"
  },
  {
    input: "Il a manger une pomme vert dans le jardin.",
    expected: "Il a mangé une pomme verte dans le jardin.",
    description: "Participe passé et accord"
  },
  {
    input: "C'est temps sont difficile pour tout le monde.",
    expected: "Ces temps sont difficiles pour tout le monde.",
    description: "C'est/Ces et accord pluriel"
  },
  {
    input: "Jene vais pas chercher de nouvelle ami.",
    expected: "Je ne vais pas chercher de nouveaux amis.",
    description: "Espaces manquants et accords"
  },
  {
    input: "Sa va bien, et toi ? J'ai été a la plage hier.",
    expected: "Ça va bien, et toi ? J'ai été à la plage hier.",
    description: "Homophones multiples"
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

// Tester un modèle
async function testModel(modelName: string): Promise<ModelResult> {
  console.log(`\n🤖 Test du modèle: ${modelName}`);
  console.log('─'.repeat(50));
  
  const results: TestResult[] = [];
  const times: number[] = [];
  let passed = 0;
  let failed = 0;

  for (const test of comparisonTests) {
    process.stdout.write(`  📝 ${test.description}... `);
    
    try {
      const startTime = performance.now();
      const output = await callOllamaWithModel(test.input, modelName);
      const endTime = performance.now();
      const time = endTime - startTime;
      
      const normalizedOutput = normalizeString(output);
      const normalizedExpected = normalizeString(test.expected);
      const success = normalizedOutput === normalizedExpected;
      
      times.push(time);
      results.push({ test, output, success, time });
      
      if (success) {
        console.log(`✅ ${time.toFixed(0)}ms`);
        passed++;
      } else {
        console.log(`❌ ${time.toFixed(0)}ms`);
        failed++;
      }
      
      // Pause entre les tests
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log(`❌ Erreur: ${error}`);
      failed++;
      results.push({ test, output: '', success: false, time: 0 });
    }
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

  // Afficher les échecs par modèle
  for (const modelResult of results) {
    const failures = modelResult.results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log(`\n❌ Échecs pour ${modelResult.model}:`);
      for (const failure of failures) {
        console.log(`   ${failure.test.description}:`);
        console.log(`     Input:    "${failure.test.input}"`);
        console.log(`     Attendu:  "${failure.test.expected}"`);
        console.log(`     Obtenu:   "${failure.output}"`);
      }
    }
  }
}

// Afficher la comparaison
function displayComparison(results: ModelResult[]) {
  console.log('\n\n🏆 COMPARAISON DES MODÈLES');
  console.log('═'.repeat(80));
  
  // Tableau de comparaison
  console.log('\n📈 Performance et Précision:\n');
  console.log('┌─────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
  console.log('│ Modèle              │ Score    │ Moy (ms) │ Min (ms) │ Max (ms) │ Total(s) │');
  console.log('├─────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
  
  for (const result of results) {
    const score = `${result.passed}/${result.passed + result.failed}`;
    const scorePercent = ((result.passed / (result.passed + result.failed)) * 100).toFixed(0);
    console.log(
      `│ ${result.model.padEnd(19)} │ ${score.padEnd(6)} ${scorePercent}% │ ${
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
  console.log('└─────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');

  // Déterminer le meilleur modèle
  const bestAccuracy = results.reduce((best, current) => 
    (current.passed / (current.passed + current.failed)) > (best.passed / (best.passed + best.failed)) 
    ? current : best
  );
  
  const bestSpeed = results.reduce((best, current) => 
    current.avgTime < best.avgTime ? current : best
  );

  console.log('\n🎯 Analyse:');
  console.log(`   🥇 Meilleure précision: ${bestAccuracy.model} (${((bestAccuracy.passed / (bestAccuracy.passed + bestAccuracy.failed)) * 100).toFixed(0)}%)`);
  console.log(`   ⚡ Plus rapide: ${bestSpeed.model} (${bestSpeed.avgTime.toFixed(0)}ms en moyenne)`);
  
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