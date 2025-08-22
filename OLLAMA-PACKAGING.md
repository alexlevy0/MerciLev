# Guide de packaging Ollama avec l'extension

## 🎯 Objectif
Éviter à l'utilisateur d'avoir à lancer Ollama séparément en intégrant le serveur directement.

## 📦 Approches possibles

### 1. **Application Electron avec Ollama intégré**

Créer une application desktop qui lance automatiquement Ollama et l'extension.

#### Avantages :
- ✅ Expérience utilisateur simplifiée
- ✅ Contrôle total sur Ollama
- ✅ Installation en un clic
- ✅ Peut gérer les modèles automatiquement

#### Inconvénients :
- ❌ Plus lourd (~150MB+)
- ❌ Nécessite une app desktop séparée
- ❌ Maintenance plus complexe

#### Implémentation :
```javascript
// main.js (Electron)
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let ollamaProcess;

app.whenReady().then(() => {
  // Lancer Ollama
  const ollamaPath = path.join(__dirname, 'ollama/ollama');
  ollamaProcess = spawn(ollamaPath, ['serve'], {
    env: {
      ...process.env,
      OLLAMA_ORIGINS: '*',
      OLLAMA_HOST: '127.0.0.1:11434'
    }
  });
  
  // Créer la fenêtre
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });
  
  win.loadFile('index.html');
});

app.on('quit', () => {
  if (ollamaProcess) {
    ollamaProcess.kill();
  }
});
```

### 2. **Extension Chrome avec Native Messaging**

Utiliser Chrome Native Messaging pour communiquer avec une app native qui gère Ollama.

#### Structure :
```
ollama-helper/
├── manifest.json          # Manifest pour native messaging
├── ollama-helper.exe/sh   # Exécutable qui lance Ollama
└── install.bat/sh         # Script d'installation
```

#### Native Host Manifest :
```json
{
  "name": "com.ollama.helper",
  "description": "Ollama Helper for Chrome Extension",
  "path": "/path/to/ollama-helper",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://YOUR_EXTENSION_ID/"
  ]
}
```

#### Helper Script (Node.js) :
```javascript
#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

let ollamaProcess;

// Fonction pour envoyer des messages à Chrome
function sendMessage(message) {
  const json = JSON.stringify(message);
  const length = Buffer.byteLength(json);
  const buffer = Buffer.allocUnsafe(4 + length);
  buffer.writeUInt32LE(length, 0);
  buffer.write(json, 4);
  process.stdout.write(buffer);
}

// Démarrer Ollama
function startOllama() {
  if (ollamaProcess) return;
  
  ollamaProcess = spawn('ollama', ['serve'], {
    env: {
      ...process.env,
      OLLAMA_ORIGINS: '*'
    }
  });
  
  ollamaProcess.on('spawn', () => {
    sendMessage({ type: 'started', port: 11434 });
  });
  
  ollamaProcess.on('error', (err) => {
    sendMessage({ type: 'error', message: err.message });
  });
}

// Écouter les messages de Chrome
process.stdin.on('data', (data) => {
  // Parser les messages...
  startOllama();
});
```

### 3. **Script d'installation automatisé**

Créer un script qui installe tout automatiquement.

#### Windows (PowerShell) :
```powershell
# install-ollama-extension.ps1

Write-Host "Installation du Correcteur Français Ollama..." -ForegroundColor Green

# 1. Vérifier si Ollama est installé
if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "Installation d'Ollama..." -ForegroundColor Yellow
    
    # Télécharger Ollama
    Invoke-WebRequest -Uri "https://ollama.ai/download/windows" -OutFile "OllamaSetup.exe"
    
    # Installer
    Start-Process -FilePath "OllamaSetup.exe" -Wait
    Remove-Item "OllamaSetup.exe"
}

# 2. Configurer Ollama pour accepter les connexions Chrome
[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")

# 3. Télécharger les modèles nécessaires
Write-Host "Téléchargement des modèles..." -ForegroundColor Yellow
ollama pull gemma3n:e2b
ollama pull qwen2.5:3b

# 4. Créer un raccourci pour lancer Ollama + Chrome
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\Correcteur Français.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-WindowStyle Hidden -Command `"Start-Process ollama serve; Start-Sleep 3; Start-Process chrome`""
$Shortcut.Save()

Write-Host "Installation terminée !" -ForegroundColor Green
```

#### macOS/Linux (Bash) :
```bash
#!/bin/bash

echo "🚀 Installation du Correcteur Français Ollama..."

# 1. Installer Ollama si nécessaire
if ! command -v ollama &> /dev/null; then
    echo "📦 Installation d'Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
fi

# 2. Configurer les variables d'environnement
echo "export OLLAMA_ORIGINS='*'" >> ~/.bashrc
source ~/.bashrc

# 3. Télécharger les modèles
echo "📥 Téléchargement des modèles..."
ollama pull gemma3n:e2b
ollama pull qwen2.5:3b

# 4. Créer un script de lancement
cat > ~/correcteur-francais.sh << 'EOF'
#!/bin/bash
# Lancer Ollama en arrière-plan
ollama serve &
OLLAMA_PID=$!

# Attendre qu'Ollama soit prêt
sleep 3

# Ouvrir Chrome
google-chrome

# Attendre la fermeture de Chrome et tuer Ollama
wait
kill $OLLAMA_PID
EOF

chmod +x ~/correcteur-francais.sh

echo "✅ Installation terminée !"
echo "Lancez avec: ~/correcteur-francais.sh"
```

### 4. **Service système (systemd/launchd/Windows Service)**

Configurer Ollama comme service système qui démarre automatiquement.

#### Linux (systemd) :
```ini
# /etc/systemd/system/ollama.service
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
Environment="OLLAMA_ORIGINS=*"
ExecStart=/usr/bin/ollama serve
Restart=always
User=YOUR_USER

[Install]
WantedBy=multi-user.target
```

#### macOS (launchd) :
```xml
<!-- ~/Library/LaunchAgents/com.ollama.server.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OLLAMA_ORIGINS</key>
        <string>*</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

### 5. **Docker Compose**

Solution conteneurisée pour les utilisateurs techniques.

```yaml
# docker-compose.yml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    environment:
      - OLLAMA_ORIGINS=*
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped
    command: serve

  model-loader:
    image: ollama/ollama:latest
    depends_on:
      - ollama
    volumes:
      - ollama_data:/root/.ollama
    command: |
      sh -c "
        sleep 5
        ollama pull gemma3n:e2b
        ollama pull qwen2.5:3b
      "

volumes:
  ollama_data:
```

## 🎯 Recommandations

### Pour une extension Chrome pure :
1. **Script d'installation** (approche 3)
   - Plus simple à maintenir
   - L'utilisateur garde le contrôle
   - Compatible avec les mises à jour d'Ollama

### Pour une solution tout-en-un :
2. **Application Electron** (approche 1)
   - Meilleure expérience utilisateur
   - Contrôle total
   - Plus professionnel

### Pour les utilisateurs avancés :
3. **Service système** (approche 4)
   - Démarre automatiquement
   - Performances optimales
   - Invisible pour l'utilisateur

## 📝 Script d'installation simple

Voici un script minimaliste qui fait tout :

```javascript
// install.js
const { exec } = require('child_process');
const os = require('os');

async function install() {
  console.log('🚀 Installation du Correcteur Français...\n');
  
  // 1. Vérifier Ollama
  exec('ollama --version', (error) => {
    if (error) {
      console.log('❌ Ollama non trouvé. Installez-le depuis: https://ollama.ai');
      process.exit(1);
    }
    
    // 2. Configurer et lancer
    console.log('✅ Ollama trouvé');
    console.log('📥 Téléchargement des modèles...');
    
    exec('ollama pull gemma3n:e2b', (err) => {
      if (!err) {
        console.log('✅ Modèle installé');
        console.log('\n🎉 Installation terminée !');
        console.log('\nPour utiliser l\'extension :');
        console.log('1. Lancez: OLLAMA_ORIGINS="*" ollama serve');
        console.log('2. Ouvrez Chrome et activez l\'extension');
      }
    });
  });
}

install();
```

## 🔧 Intégration dans l'extension

Ajouter un bouton dans le popup pour vérifier/installer :

```typescript
// popup.ts
async function checkOllamaInstallation() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    
    if (!data.models.some(m => m.name.includes('gemma3n:e2b'))) {
      showInstallInstructions();
    }
  } catch (error) {
    showInstallInstructions();
  }
}

function showInstallInstructions() {
  // Afficher les instructions d'installation
  const instructions = `
    <div class="install-guide">
      <h3>🚀 Installation rapide</h3>
      <ol>
        <li>Téléchargez Ollama : <a href="https://ollama.ai">ollama.ai</a></li>
        <li>Lancez dans un terminal :<br>
            <code>OLLAMA_ORIGINS="*" ollama serve</code></li>
        <li>Installez le modèle :<br>
            <code>ollama pull gemma3n:e2b</code></li>
      </ol>
    </div>
  `;
}
```

## 📌 Conclusion

Le packaging d'Ollama dépend de vos priorités :
- **Simplicité** → Script d'installation
- **Expérience utilisateur** → Application Electron
- **Performance** → Service système
- **Portabilité** → Docker

L'approche par script reste la plus flexible et maintenable pour une extension Chrome ! 🚀