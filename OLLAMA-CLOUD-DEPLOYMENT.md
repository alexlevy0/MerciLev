# Déploiement d'Ollama sur le Cloud

## 🌐 Exposer Ollama sur Internet

### Avantages ✅
- Plus besoin d'installer Ollama localement
- Fonctionne sur tous les appareils
- Maintenance centralisée
- Partage possible entre utilisateurs

### Inconvénients ⚠️
- Latence réseau (50-200ms vs 5-20ms local)
- Coûts serveur (CPU/GPU + bande passante)
- Sécurité à gérer
- Limite de requêtes nécessaire

## 📦 Solutions de déploiement

### 1. **VPS avec Tunnel (Recommandé pour débuter)**

#### a) Ngrok (Rapide mais temporaire)
```bash
# Sur votre serveur/machine locale
ollama serve

# Dans un autre terminal
ngrok http 11434

# Vous obtenez une URL comme : https://abc123.ngrok.io
```

#### b) Cloudflare Tunnel (Gratuit et permanent)
```bash
# Installer cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Créer un tunnel
./cloudflared tunnel login
./cloudflared tunnel create ollama-api

# Configuration
cat > ~/.cloudflared/config.yml << EOF
tunnel: ollama-api
credentials-file: /home/user/.cloudflared/[TUNNEL_ID].json

ingress:
  - hostname: ollama.votredomaine.com
    service: http://localhost:11434
  - service: http_status:404
EOF

# Lancer
./cloudflared tunnel run ollama-api
```

### 2. **VPS Dédié (Production)**

#### Configuration Nginx avec SSL
```nginx
server {
    listen 443 ssl http2;
    server_name ollama.votredomaine.com;

    ssl_certificate /etc/letsencrypt/live/ollama.votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ollama.votredomaine.com/privkey.pem;

    # Sécurité
    location / {
        # Authentification basique
        auth_basic "Ollama API";
        auth_basic_user_file /etc/nginx/.htpasswd;
        
        # CORS pour l'extension
        add_header 'Access-Control-Allow-Origin' 'chrome-extension://VOTRE_EXTENSION_ID' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        # Limite de taux
        limit_req zone=ollama_limit burst=10 nodelay;
        
        # Proxy vers Ollama
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeout pour les longues requêtes
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}

# Zone de limite
limit_req_zone $binary_remote_addr zone=ollama_limit:10m rate=10r/s;
```

#### Service systemd
```ini
[Unit]
Description=Ollama API Server
After=network.target

[Service]
Type=simple
User=ollama
Group=ollama
WorkingDirectory=/home/ollama
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"
Environment="OLLAMA_MAX_LOADED_MODELS=2"
Environment="OLLAMA_NUM_PARALLEL=4"
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

# Limites de ressources
LimitNOFILE=65536
MemoryLimit=8G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```

### 3. **Docker Compose (Scalable)**

```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "127.0.0.1:11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
      - OLLAMA_ORIGINS=*
      - OLLAMA_MAX_LOADED_MODELS=2
      - OLLAMA_NUM_PARALLEL=4
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 8G
        reservations:
          cpus: '1'
          memory: 4G
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/version"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
      - ./auth:/etc/nginx/auth:ro
    depends_on:
      - ollama
    restart: unless-stopped

  # Optionnel : Monitoring
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

volumes:
  ollama_data:
  prometheus_data:
```

### 4. **Hébergeurs GPU (Pour modèles lourds)**

#### RunPod
```python
# runpod_deploy.py
import runpod

def handler(job):
    input_data = job['input']
    
    # Appeler Ollama
    response = ollama.generate(
        model=input_data['model'],
        prompt=input_data['prompt']
    )
    
    return response

runpod.serverless.start({
    "handler": handler,
    "return_aggregate_stream": True
})
```

#### Replicate
```javascript
// replicate_wrapper.js
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function callModel(prompt) {
  const output = await replicate.run(
    "meta/llama-2-7b-chat:latest",
    {
      input: {
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.7
      }
    }
  );
  return output;
}
```

## 🔒 Sécurité IMPORTANTE

### 1. **Authentification API**

```javascript
// backend.ts - Génération de tokens
import jwt from 'jsonwebtoken';

function generateAPIToken(userId: string) {
  return jwt.sign(
    { userId, type: 'api' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Middleware de vérification
function verifyAPIToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
}
```

### 2. **Rate Limiting**

```javascript
// rate-limiter.js
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: 'Trop de requêtes, réessayez plus tard',
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requêtes par minute
  skipSuccessfulRequests: false,
});
```

### 3. **Monitoring des coûts**

```javascript
// cost-tracker.js
class CostTracker {
  constructor() {
    this.costs = new Map();
  }
  
  trackRequest(userId, modelName, tokens) {
    const cost = this.calculateCost(modelName, tokens);
    const current = this.costs.get(userId) || 0;
    this.costs.set(userId, current + cost);
    
    // Alerte si dépassement
    if (current + cost > 10) { // 10$ limite
      this.alertAdmin(userId, current + cost);
    }
  }
  
  calculateCost(model, tokens) {
    const rates = {
      'gemma3n:e2b': 0.0001, // par 1k tokens
      'qwen2.5:3b': 0.0002,
      'qwen2.5:7b': 0.0005,
    };
    return (tokens / 1000) * (rates[model] || 0.0001);
  }
}
```

## 🔧 Configuration de l'extension

### Modifier ollama-prompt.ts
```typescript
// Support multi-endpoints
export const OLLAMA_ENDPOINTS = {
  local: 'http://localhost:11434',
  cloud: 'https://ollama.votredomaine.com',
  backup: 'https://ollama-backup.votredomaine.com'
};

export let CURRENT_ENDPOINT = OLLAMA_ENDPOINTS.local;

export function setEndpoint(endpoint: keyof typeof OLLAMA_ENDPOINTS | string) {
  if (typeof endpoint === 'string' && endpoint in OLLAMA_ENDPOINTS) {
    CURRENT_ENDPOINT = OLLAMA_ENDPOINTS[endpoint];
  } else if (endpoint.startsWith('http')) {
    CURRENT_ENDPOINT = endpoint;
  }
}
```

### Modifier background.ts
```typescript
// Ajout de l'authentification
async function callOllama(sentence: string): Promise<string> {
  const apiToken = await chrome.storage.sync.get('apiToken');
  
  const response = await fetch(`${CURRENT_ENDPOINT}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiToken.apiToken ? `Bearer ${apiToken.apiToken}` : undefined
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      system: CORRECTION_SYSTEM_PROMPT,
      prompt: sentence,
      stream: false,
      options: getModelOptions(MODEL_NAME)
    })
  });
  
  // Gestion d'erreur améliorée
  if (response.status === 429) {
    throw new Error('Limite de requêtes atteinte. Réessayez plus tard.');
  }
  
  if (response.status === 401) {
    throw new Error('Token API invalide. Vérifiez vos paramètres.');
  }
  
  // ... reste du code
}
```

## 💰 Estimation des coûts

### VPS basique (2-4 vCPU, 8GB RAM)
- **DigitalOcean** : ~20-40$/mois
- **Hetzner** : ~10-20$/mois
- **OVH** : ~15-30$/mois

### GPU Cloud (pour gros modèles)
- **RunPod** : ~0.30$/heure (RTX 3090)
- **Vast.ai** : ~0.20$/heure (marché)
- **Lambda Labs** : ~0.80$/heure (A100)

### Bande passante
- ~1KB par requête
- 1000 requêtes/jour = 30MB/mois
- Généralement inclus dans VPS

## 📊 Architecture recommandée

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Extension  │────▶│  CloudFlare  │────▶│   Nginx     │
│   Chrome    │     │     CDN      │     │  (SSL/Auth) │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                         ┌───────▼────────┐
                                         │   Ollama API   │
                                         │  (Rate Limited)│
                                         └───────┬────────┘
                                                 │
                                         ┌───────▼────────┐
                                         │    Redis       │
                                         │   (Cache)      │
                                         └────────────────┘
```

## 🚀 Script de déploiement rapide

```bash
#!/bin/bash
# deploy-ollama.sh

# Variables
DOMAIN="ollama.votredomaine.com"
EMAIL="votre@email.com"

# Installer Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Installer Nginx et Certbot
apt update && apt install -y nginx certbot python3-certbot-nginx

# Configurer Nginx
cat > /etc/nginx/sites-available/ollama << EOF
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host \$host;
    }
}
EOF

ln -s /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL avec Let's Encrypt
certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# Démarrer Ollama
OLLAMA_HOST=0.0.0.0:11434 OLLAMA_ORIGINS=* ollama serve
```

## ✅ Checklist de production

- [ ] SSL/TLS activé (HTTPS obligatoire)
- [ ] Authentification API
- [ ] Rate limiting configuré
- [ ] Monitoring des ressources
- [ ] Backup des modèles
- [ ] Logs centralisés
- [ ] Alertes de dépassement
- [ ] CDN pour réduire latence
- [ ] Failover/backup serveur
- [ ] Documentation API

C'est totalement faisable et ça simplifierait beaucoup l'utilisation de votre extension ! 🚀