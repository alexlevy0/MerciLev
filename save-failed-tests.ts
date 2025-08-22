#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { writeFileSync } from 'fs';

export interface FailedTest {
  description: string;
  input: string;
  expected: string;
  obtained: string;
  model?: string;
  timestamp: string;
}

export function saveFailedTests(failedTests: FailedTest[], filename: string = 'failed-tests.json') {
  const data = {
    timestamp: new Date().toISOString(),
    totalFailed: failedTests.length,
    tests: failedTests
  };
  
  try {
    writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n💾 Tests échoués sauvegardés dans: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la sauvegarde: ${error}`);
    return false;
  }
}

// Générer un rapport markdown des échecs
export function generateFailureReport(failedTests: FailedTest[], filename: string = 'failed-tests-report.md') {
  let report = `# Rapport des tests échoués\n\n`;
  report += `Date: ${new Date().toISOString()}\n\n`;
  report += `Total des échecs: ${failedTests.length}\n\n`;
  
  // Grouper par modèle si disponible
  const byModel = new Map<string, FailedTest[]>();
  
  failedTests.forEach(test => {
    const model = test.model || 'default';
    if (!byModel.has(model)) {
      byModel.set(model, []);
    }
    byModel.get(model)!.push(test);
  });
  
  byModel.forEach((tests, model) => {
    report += `## Modèle: ${model}\n\n`;
    
    tests.forEach((test, index) => {
      report += `### ${index + 1}. ${test.description}\n\n`;
      report += `**Input:**\n\`\`\`\n${test.input}\n\`\`\`\n\n`;
      report += `**Attendu:**\n\`\`\`\n${test.expected}\n\`\`\`\n\n`;
      report += `**Obtenu:**\n\`\`\`\n${test.obtained}\n\`\`\`\n\n`;
      report += `---\n\n`;
    });
  });
  
  report += `## Suggestions pour corriger le prompt\n\n`;
  report += `1. Vérifier les règles spécifiques pour ces cas\n`;
  report += `2. Ajouter des exemples explicites dans le prompt\n`;
  report += `3. Renforcer les instructions pour ces types d'erreurs\n`;
  
  try {
    writeFileSync(filename, report);
    console.log(`📄 Rapport détaillé généré: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la génération du rapport: ${error}`);
    return false;
  }
}

// Si exécuté directement, lire et afficher le dernier rapport
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const fs = await import('fs');
    const data = JSON.parse(fs.readFileSync('failed-tests.json', 'utf-8'));
    console.log(`\n📊 Derniers tests échoués (${data.timestamp}):`);
    console.log(`   Total: ${data.totalFailed} échecs\n`);
    
    data.tests.forEach((test: FailedTest) => {
      console.log(`❌ ${test.description}`);
      console.log(`   Input: "${test.input}"`);
      console.log(`   Attendu: "${test.expected}"`);
      console.log(`   Obtenu: "${test.obtained}"\n`);
    });
  } catch (error) {
    console.log('Aucun fichier de tests échoués trouvé.');
  }
}