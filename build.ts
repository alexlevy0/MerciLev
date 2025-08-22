#!/usr/bin/env -S node --experimental-strip-types --no-warnings
import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

console.log('🏗️  Construction de l\'extension Chrome...');
console.log('');
console.log('ℹ️  Note: Chrome nécessite du JavaScript, donc nous devons compiler le TypeScript');
console.log('');

// Nettoyer les anciens fichiers JS de l'extension
console.log('🧹 Nettoyage des anciens fichiers...');
try {
  execSync('rm -f background.js content.js popup.js', { stdio: 'inherit' });
} catch (error) {
  // Ignorer les erreurs si les fichiers n'existent pas
}

// Compiler avec esbuild
console.log('📦 Compilation des fichiers TypeScript de l\'extension...');
try {
  execSync('npx esbuild background.ts content.ts popup.ts options.ts --bundle --outdir=. --format=iife', { 
    stdio: 'inherit' 
  });
  
  console.log('');
  console.log('✅ Extension compilée avec succès !');
  console.log('');
  console.log('📁 Fichiers générés :');
  
  // Lister les fichiers JS générés
  const jsFiles = ['background.js', 'content.js', 'popup.js'];
  jsFiles.forEach(file => {
    if (existsSync(file)) {
      const stats = statSync(file);
      const size = (stats.size / 1024).toFixed(1);
      console.log(`   - ${file} (${size}K)`);
    }
  });
  
  console.log('');
  console.log('🚀 Pour installer l\'extension :');
  console.log('   1. Ouvrez chrome://extensions/');
  console.log('   2. Activez le mode développeur');
  console.log('   3. Cliquez sur \'Charger l\'extension non empaquetée\'');
  console.log(`   4. Sélectionnez le dossier : ${process.cwd()}`);
  
} catch (error) {
  console.error('');
  console.error('❌ Erreur lors de la compilation !');
  process.exit(1);
}