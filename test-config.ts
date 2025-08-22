// Configuration partagée pour les tests

export const TEST_CONFIG = {
  // Configuration des retries
  MAX_RETRIES: 3,
  RETRY_DELAY: 500, // ms entre les retries
  
  // Configuration des délais
  TEST_DELAY: 300, // ms entre chaque test
  
  // Options d'affichage
  SHOW_RETRY_DETAILS: true,
  SHOW_FAILED_SUMMARY: true,
  
  // Pour les tests de développement
  STOP_ON_FIRST_FAILURE: false,
};

// Messages de retry
export const RETRY_MESSAGES = {
  RETRY_ATTEMPT: (attempt: number, max: number) => 
    `   🔄 Essai ${attempt}/${max} échoué, nouvelle tentative...`,
  
  RETRY_ERROR: (attempt: number, max: number) => 
    `   🔄 Essai ${attempt}/${max} - Erreur, nouvelle tentative...`,
  
  RETRY_SUCCESS: (attempts: number) => 
    `   🔄 Réussi après ${attempts} essai(s)`,
  
  RETRY_FINAL_FAILURE: (max: number) => 
    `   ❌ ÉCHEC après ${max} essais`,
};

// Helper pour afficher ou non les détails de retry
export function logRetry(message: string) {
  if (TEST_CONFIG.SHOW_RETRY_DETAILS) {
    console.log(message);
  }
}