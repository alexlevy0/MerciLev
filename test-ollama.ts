// FICHIER: test-ollama.ts
// Script de test pour vérifier les corrections avec Ollama

import { CORRECTION_SYSTEM_PROMPT, MODEL_NAME, OLLAMA_ENDPOINT, setModel, MODELS, getModelOptions } from './ollama-prompt.ts';

// Utiliser le modèle spécifié par l'environnement si disponible
if (process.env.OLLAMA_MODEL) {
  const envModel = process.env.OLLAMA_MODEL;
  if (Object.values(MODELS).includes(envModel as any)) {
    setModel(envModel as any);
    console.log(`📌 Utilisation du modèle: ${envModel}\n`);
  }
}

interface TestCase {
  input: string;
  expected: string;
  description: string;
}

// Cas de test pour vérifier les corrections
const testCases: TestCase[] = [
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

// Fonction pour appeler Ollama
async function callOllama(sentence: string): Promise<string> {
  const system = CORRECTION_SYSTEM_PROMPT;
  
  const prompt = `Phrase avec des fautes: "${sentence}"

Corrige TOUTES les fautes (orthographe, grammaire, conjugaison, accords, homophones). Retourne la phrase corrigée.`;

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
        stream: false,
        options: getModelOptions(MODEL_NAME)
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('Erreur Ollama:', error);
    throw error;
  }
}

// Fonction pour comparer deux chaînes (ignorer espaces multiples)
function normalizeString(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

// Configuration des retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 500; // ms entre les retries

// Exécuter un test avec retry
async function runTestWithRetry(test: TestCase): Promise<{success: boolean, result: string, time: number, attempts: number}> {
  let lastResult = '';
  let lastTime = 0;
  let attempts = 0;
  
  while (attempts < MAX_RETRIES) {
    attempts++;
    
    try {
      const startTime = performance.now();
      const result = await callOllama(test.input);
      const endTime = performance.now();
      lastTime = endTime - startTime;
      lastResult = result;
      
      const normalizedResult = normalizeString(result);
      const normalizedExpected = normalizeString(test.expected);
      
      if (normalizedResult === normalizedExpected) {
        return { success: true, result, time: lastTime, attempts };
      }
      
      // Si échec et pas le dernier essai, afficher et attendre
      if (attempts < MAX_RETRIES) {
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
  
  return { success: false, result: lastResult, time: lastTime, attempts };
}

// Exécuter les tests
async function runTests() {
  console.log('🧪 Démarrage des tests de correction avec Ollama...');
  console.log('   (Retry automatique jusqu\'à 3 fois en cas d\'échec)\n');
  
  let passed = 0;
  let failed = 0;
  const responseTimes: number[] = [];
  const failedTests: {test: TestCase, result: string}[] = [];
  
  for (const test of testCases) {
    console.log(`📝 Test: ${test.description}`);
    console.log(`   Input:    "${test.input}"`);
    
    const testResult = await runTestWithRetry(test);
    responseTimes.push(testResult.time);
    
    if (testResult.success) {
      console.log(`   ✅ Résultat: "${testResult.result}"`);
      console.log(`   ⏱️  Temps: ${testResult.time.toFixed(0)}ms`);
      if (testResult.attempts > 1) {
        console.log(`   🔄 Réussi après ${testResult.attempts} essai(s)`);
      }
      console.log(`   ✅ SUCCÈS\n`);
      passed++;
    } else {
      console.log(`   ❌ Résultat: "${testResult.result}"`);
      console.log(`   ❌ Attendu:  "${test.expected}"`);
      console.log(`   ⏱️  Temps: ${testResult.time.toFixed(0)}ms`);
      console.log(`   ❌ ÉCHEC après ${MAX_RETRIES} essais\n`);
      failed++;
      failedTests.push({ test, result: testResult.result });
    }
    
    // Attendre un peu entre les tests pour ne pas surcharger Ollama
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Calculer les statistiques de temps
  const avgTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  const minTime = responseTimes.length > 0 
    ? Math.min(...responseTimes) 
    : 0;
  const maxTime = responseTimes.length > 0 
    ? Math.max(...responseTimes) 
    : 0;
  
  console.log('\n📊 Résumé des tests:');
  console.log(`   ✅ Réussis: ${passed}/${testCases.length}`);
  console.log(`   ❌ Échoués: ${failed}/${testCases.length}`);
  console.log(`   📈 Taux de réussite: ${Math.round((passed / testCases.length) * 100)}%`);
  
  console.log('\n⏱️  Statistiques de temps de réponse:');
  console.log(`   🔹 Moyenne: ${avgTime.toFixed(0)}ms`);
  console.log(`   🔸 Minimum: ${minTime.toFixed(0)}ms`);
  console.log(`   🔺 Maximum: ${maxTime.toFixed(0)}ms`);
  
  // Afficher les tests échoués pour analyse
  if (failedTests.length > 0) {
    console.log('\n🔍 Tests échoués après 3 essais (à corriger dans le prompt):');
    console.log('─'.repeat(60));
    for (const {test, result} of failedTests) {
      console.log(`\n❌ "${test.description}"`);
      console.log(`   Input:    "${test.input}"`);
      console.log(`   Attendu:  "${test.expected}"`);
      console.log(`   Obtenu:   "${result}"`);
    }
    console.log('\n💡 Ces tests nécessitent probablement un ajustement du prompt.');
  }
}

// Tester la connexion à Ollama
async function testConnection(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/');
    return response.ok;
  } catch {
    return false;
  }
}

// Point d'entrée principal
async function main() {
  console.log('🚀 Test de l\'extension de correction française avec Ollama\n');
  
  // Vérifier la connexion
  console.log('🔌 Vérification de la connexion à Ollama...');
  const connected = await testConnection();
  
  if (!connected) {
    console.error('❌ Impossible de se connecter à Ollama !');
    console.error('   Assurez-vous qu\'Ollama est démarré avec :');
    console.error('   OLLAMA_ORIGINS="*" ollama serve\n');
    process.exit(1);
  }
  
  console.log('✅ Connexion à Ollama établie\n');
  
  // Vérifier le modèle
  console.log(`🤖 Vérification du modèle ${MODEL_NAME}...`);
  try {
    await callOllama('test');
    console.log('✅ Modèle disponible\n');
  } catch (error) {
    console.error(`❌ Le modèle ${MODEL_NAME} n'est pas disponible !`);
    console.error(`   Installez-le avec : ollama pull ${MODEL_NAME}\n`);
    process.exit(1);
  }
  
  // Exécuter les tests
  await runTests();
}

// Exécuter si lancé directement
main().catch(console.error);