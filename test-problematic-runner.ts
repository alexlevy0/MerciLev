#!/usr/bin/env tsx
import { execSync } from 'child_process';
import http from 'http';

console.log('🧪 Test des cas problématiques');
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

  // Exécuter le test directement avec Node.js et le flag expérimental
  try {
    execSync('tsx test-problematic.ts', { 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests');
    process.exit(1);
  }
}

// Exécuter
main().catch(console.error);