// options.ts - Gestion des paramètres de l'extension

interface SiteConfig {
  domain: string;
  enabled: boolean;
  mode?: 'normal' | 'performance' | 'disabled';
}

interface ExtensionSettings {
  globalMode: 'normal' | 'performance' | 'smart';
  sites: SiteConfig[];
  limitElements: boolean;
  disableRecursive: boolean;
  showDebugInfo: boolean;
  maxElementsNormal: number;
  maxElementsPerformance: number;
}

// Configuration par défaut
const DEFAULT_SETTINGS: ExtensionSettings = {
  globalMode: 'normal',
  sites: [
    // Sites problématiques par défaut, mais l'utilisateur peut les activer
    { domain: 'slack.com', enabled: false, mode: 'disabled' },
    { domain: 'discord.com', enabled: false, mode: 'disabled' },
    { domain: 'messenger.com', enabled: false, mode: 'disabled' },
    { domain: 'facebook.com', enabled: true, mode: 'performance' },
    { domain: 'teams.microsoft.com', enabled: false, mode: 'disabled' },
    { domain: 'notion.so', enabled: true, mode: 'performance' },
    { domain: 'figma.com', enabled: false, mode: 'disabled' },
    { domain: 'docs.google.com', enabled: false, mode: 'disabled' },
    { domain: 'sheets.google.com', enabled: false, mode: 'disabled' },
    { domain: 'mail.google.com', enabled: true, mode: 'performance' }
  ],
  limitElements: true,
  disableRecursive: true,
  showDebugInfo: false,
  maxElementsNormal: 30,
  maxElementsPerformance: 10
};

let currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS };

// Charger les paramètres
async function loadSettings() {
  const stored = await chrome.storage.sync.get('extensionSettings');
  if (stored.extensionSettings) {
    currentSettings = { ...DEFAULT_SETTINGS, ...stored.extensionSettings };
  }
  updateUI();
}

// Sauvegarder les paramètres
async function saveSettings() {
  await chrome.storage.sync.set({ extensionSettings: currentSettings });
  showSaveStatus();
  
  // Notifier le content script du changement
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'settings-updated', settings: currentSettings }).catch(() => {});
      }
    });
  });
}

// Afficher le statut de sauvegarde
function showSaveStatus() {
  const status = document.getElementById('saveStatus');
  if (status) {
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  }
}

// Mettre à jour l'interface
function updateUI() {
  // Mode global
  document.querySelectorAll('.mode-option').forEach(option => {
    const mode = option.getAttribute('data-mode');
    if (mode === currentSettings.globalMode) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
  
  // Liste des sites
  updateSiteList();
  
  // Options de performance
  const limitElements = document.getElementById('limitElements') as HTMLInputElement;
  const disableRecursive = document.getElementById('disableRecursive') as HTMLInputElement;
  const showDebugInfo = document.getElementById('showDebugInfo') as HTMLInputElement;
  
  if (limitElements) limitElements.checked = currentSettings.limitElements;
  if (disableRecursive) disableRecursive.checked = currentSettings.disableRecursive;
  if (showDebugInfo) showDebugInfo.checked = currentSettings.showDebugInfo;
}

// Mettre à jour la liste des sites
function updateSiteList() {
  const siteList = document.getElementById('siteList');
  if (!siteList) return;
  
  siteList.innerHTML = '';
  
  currentSettings.sites.forEach((site, index) => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    
    siteItem.innerHTML = `
      <div class="site-name">${site.domain}</div>
      <div class="site-status">
        <select class="site-mode" data-index="${index}">
          <option value="normal" ${site.mode === 'normal' ? 'selected' : ''}>Normal</option>
          <option value="performance" ${site.mode === 'performance' ? 'selected' : ''}>Performance</option>
          <option value="disabled" ${site.mode === 'disabled' ? 'selected' : ''}>Désactivé</option>
        </select>
        <button class="remove-site" data-index="${index}" style="background: #ef4444; padding: 5px 10px;">✕</button>
      </div>
    `;
    
    siteList.appendChild(siteItem);
  });
  
  // Ajouter les événements
  document.querySelectorAll('.site-mode').forEach(select => {
    select.addEventListener('change', (e) => {
      const index = parseInt((e.target as HTMLSelectElement).dataset.index!);
      const value = (e.target as HTMLSelectElement).value as 'normal' | 'performance' | 'disabled';
      currentSettings.sites[index].mode = value;
      currentSettings.sites[index].enabled = value !== 'disabled';
      saveSettings();
    });
  });
  
  document.querySelectorAll('.remove-site').forEach(button => {
    button.addEventListener('click', (e) => {
      const index = parseInt((e.target as HTMLElement).dataset.index!);
      currentSettings.sites.splice(index, 1);
      updateSiteList();
      saveSettings();
    });
  });
}

// Ajouter un site
function addSite() {
  const input = document.getElementById('newSite') as HTMLInputElement;
  const domain = input.value.trim().toLowerCase();
  
  if (!domain) return;
  
  // Vérifier si le site existe déjà
  if (currentSettings.sites.some(site => site.domain === domain)) {
    alert('Ce site est déjà dans la liste');
    return;
  }
  
  currentSettings.sites.push({
    domain: domain,
    enabled: true,
    mode: 'normal'
  });
  
  input.value = '';
  updateSiteList();
  saveSettings();
}

// Réinitialiser les paramètres
function resetSettings() {
  if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
    currentSettings = { ...DEFAULT_SETTINGS };
    updateUI();
    saveSettings();
  }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // Mode global
  document.querySelectorAll('.mode-option').forEach(option => {
    option.addEventListener('click', () => {
      const mode = option.getAttribute('data-mode') as 'normal' | 'performance' | 'smart';
      currentSettings.globalMode = mode;
      updateUI();
      saveSettings();
    });
  });
  
  // Options de performance
  document.getElementById('limitElements')?.addEventListener('change', (e) => {
    currentSettings.limitElements = (e.target as HTMLInputElement).checked;
    saveSettings();
  });
  
  document.getElementById('disableRecursive')?.addEventListener('change', (e) => {
    currentSettings.disableRecursive = (e.target as HTMLInputElement).checked;
    saveSettings();
  });
  
  document.getElementById('showDebugInfo')?.addEventListener('change', (e) => {
    currentSettings.showDebugInfo = (e.target as HTMLInputElement).checked;
    saveSettings();
  });
  
  // Ajouter un site
  document.getElementById('addSiteBtn')?.addEventListener('click', addSite);
  document.getElementById('newSite')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
  });
  
  // Réinitialiser
  document.getElementById('resetBtn')?.addEventListener('click', resetSettings);
});