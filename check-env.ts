#!/usr/bin/env -S node --experimental-strip-types --no-warnings

console.log('🔍 Vérification de l\'environnement...\n');

// Vérifier la version de Node.js
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

console.log(`📦 Node.js: ${nodeVersion}`);
if (majorVersion >= 24) {
  console.log('✅ Node.js 24+ détecté - Support TypeScript natif disponible');
} else {
  console.error('❌ Node.js 24+ requis pour le support TypeScript natif');
  console.error('   Installez Node.js 24 avec: nvm install 24');
  process.exit(1);
}

// Vérifier npm
console.log(`📦 npm: ${process.env.npm_version || 'non détecté'}`);

// Vérifier l'OS et l'architecture
console.log(`\n💻 Système:`);
console.log(`   OS: ${process.platform}`);
console.log(`   Architecture: ${process.arch}`);

// Vérifier esbuild
try {
  const { execSync } = await import('child_process');
  const esbuildVersion = execSync('npx esbuild --version', { encoding: 'utf-8' }).trim();
  console.log(`\n🛠️  esbuild: ${esbuildVersion}`);
  console.log('✅ esbuild fonctionnel');
} catch (error) {
  console.error('\n❌ esbuild non trouvé ou non fonctionnel');
  console.error('   Installez avec: npm install -D esbuild');
}

console.log('\n✨ Environnement prêt pour le développement !');