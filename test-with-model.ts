#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { setModel, MODELS, ModelName } from './ollama-prompt.ts';
import { execSync } from 'child_process';

// Récupérer le modèle depuis les arguments
const modelArg = process.argv[2];
const scriptType = process.argv[3] || 'test-ollama.ts';

if (!modelArg || !Object.values(MODELS).includes(modelArg as ModelName)) {
  console.error('❌ Modèle invalide ou non spécifié');
  console.error('\nUtilisation:');
  console.error('  ./test-with-model.ts <model> [script]');
  console.error('\nModèles disponibles:');
  Object.entries(MODELS).forEach(([key, value]) => {
    console.error(`  - ${value}`);
  });
  console.error('\nScripts disponibles:');
  console.error('  - test-ollama.ts (défaut)');
  console.error('  - test-problematic.ts');
  process.exit(1);
}

// Définir le modèle
const model = modelArg as ModelName;
setModel(model);

console.log(`\n🤖 Exécution des tests avec le modèle: ${model}`);
console.log('═'.repeat(60));
console.log('');

// Exécuter le script de test
try {
  execSync(`node --experimental-strip-types --no-warnings ${scriptType}`, { 
    stdio: 'inherit',
    env: { ...process.env, OLLAMA_MODEL: model }
  });
} catch (error) {
  process.exit(1);
}