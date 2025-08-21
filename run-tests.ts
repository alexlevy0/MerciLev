#!/usr/bin/env -S node --experimental-strip-types --no-warnings
import { execSync } from 'child_process';
import http from 'http';

console.log('🚀 Lancement des tests de correction française');
console.log('');

// Fonction pour vérifier si Ollama est en cours d'exécution
async function checkOllama(): Promise<boolean> {
  return new Promise((resolve) => {
    http.get('http://localhost:11434/', (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Fonction principale
async function main() {
  // Vérifier si Ollama est en cours d'exécution
  const ollamaRunning = await checkOllama();
  
  if (!ollamaRunning) {
    console.error('❌ Ollama n\'est pas démarré !');
    console.error('   Lancez-le avec : OLLAMA_ORIGINS=\'*\' ollama serve');
    process.exit(1);
  }

  // Exécuter les tests directement avec Node.js et le flag expérimental
  console.log('🧪 Exécution des tests...');
  console.log('');
  
  try {
    execSync('node --experimental-strip-types --no-warnings test-ollama.ts', { 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests');
    process.exit(1);
  }
}

// Exécuter
main().catch(console.error);