#!/bin/bash

# Script de déploiement rapide d'Ollama sur le web
# Usage: ./deploy-quick.sh

echo "🚀 Déploiement rapide d'Ollama sur le web"
echo "========================================="

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then 
   echo "❌ Ce script doit être exécuté en tant que root (sudo)"
   exit 1
fi

# Variables (à modifier selon vos besoins)
read -p "Entrez votre domaine (ex: ollama.monsite.com) : " DOMAIN
read -p "Entrez votre email pour SSL : " EMAIL

# 1. Installer Ollama
echo "📦 Installation d'Ollama..."
if ! command -v ollama &> /dev/null; then
    curl -fsSL https://ollama.ai/install.sh | sh
else
    echo "✅ Ollama déjà installé"
fi

# 2. Installer les dépendances
echo "📦 Installation de Nginx et Certbot..."
apt update
apt install -y nginx certbot python3-certbot-nginx ufw

# 3. Configurer le firewall
echo "🔥 Configuration du firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 4. Créer l'utilisateur ollama
echo "👤 Création de l'utilisateur ollama..."
if ! id "ollama" &>/dev/null; then
    useradd -r -s /bin/false -m -d /var/lib/ollama ollama
fi

# 5. Créer le service systemd
echo "⚙️ Configuration du service Ollama..."
cat > /etc/systemd/system/ollama.service << EOF
[Unit]
Description=Ollama API Service
After=network-online.target

[Service]
Type=simple
User=ollama
Group=ollama
WorkingDirectory=/var/lib/ollama
Environment="OLLAMA_HOST=127.0.0.1:11434"
Environment="OLLAMA_ORIGINS=*"
Environment="OLLAMA_MAX_LOADED_MODELS=2"
Environment="OLLAMA_NUM_PARALLEL=2"
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

# Sécurité
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/ollama

# Limites
LimitNOFILE=65536
MemoryHigh=6G
MemoryMax=8G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
EOF

# 6. Configurer Nginx
echo "🌐 Configuration de Nginx..."
cat > /etc/nginx/sites-available/ollama << EOF
# Limite de requêtes
limit_req_zone \$binary_remote_addr zone=ollama_limit:10m rate=5r/s;

server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirection HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL sera configuré par Certbot
    
    # Logs
    access_log /var/log/nginx/ollama_access.log;
    error_log /var/log/nginx/ollama_error.log;
    
    # Sécurité headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        # CORS pour Chrome extensions
        if (\$http_origin ~* "^chrome-extension://") {
            add_header 'Access-Control-Allow-Origin' \$http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
        }
        
        # Gestion des OPTIONS (preflight)
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' \$http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        # Limite de requêtes
        limit_req zone=ollama_limit burst=10 nodelay;
        
        # Proxy vers Ollama
        proxy_pass http://127.0.0.1:11434;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts pour les longues requêtes
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        
        # Buffer sizes
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # Désactiver la mise en buffer pour le streaming
        proxy_buffering off;
    }
    
    # Endpoint de santé
    location /health {
        access_log off;
        add_header 'Content-Type' 'text/plain';
        return 200 'OK';
    }
}
EOF

# 7. Activer le site
ln -sf /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 8. Tester et recharger Nginx
nginx -t
systemctl reload nginx

# 9. Obtenir le certificat SSL
echo "🔒 Configuration SSL avec Let's Encrypt..."
certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect

# 10. Télécharger les modèles
echo "📥 Téléchargement des modèles..."
sudo -u ollama ollama pull gemma3n:e2b
sudo -u ollama ollama pull qwen2.5:3b

# 11. Démarrer les services
echo "🚀 Démarrage des services..."
systemctl daemon-reload
systemctl enable ollama
systemctl start ollama
systemctl restart nginx

# 12. Créer un script de monitoring
echo "📊 Création du script de monitoring..."
cat > /usr/local/bin/ollama-monitor.sh << 'EOF'
#!/bin/bash
# Monitoring simple pour Ollama

# Vérifier si Ollama répond
if curl -s http://localhost:11434/api/version > /dev/null; then
    echo "✅ Ollama fonctionne"
else
    echo "❌ Ollama ne répond pas, redémarrage..."
    systemctl restart ollama
fi

# Vérifier l'utilisation mémoire
MEM_USAGE=$(ps aux | grep ollama | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
echo "💾 Mémoire utilisée: ${MEM_USAGE}MB"

# Vérifier l'espace disque
DISK_USAGE=$(df -h /var/lib/ollama | tail -1 | awk '{print $5}')
echo "💿 Espace disque utilisé: $DISK_USAGE"
EOF

chmod +x /usr/local/bin/ollama-monitor.sh

# 13. Ajouter au cron
echo "⏰ Configuration du monitoring automatique..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/ollama-monitor.sh >> /var/log/ollama-monitor.log 2>&1") | crontab -

# 14. Afficher les informations
echo ""
echo "✅ Déploiement terminé !"
echo "========================"
echo ""
echo "📌 Informations importantes :"
echo "- URL : https://$DOMAIN"
echo "- Port : 443 (HTTPS)"
echo "- Logs Ollama : journalctl -u ollama -f"
echo "- Logs Nginx : tail -f /var/log/nginx/ollama_*.log"
echo "- Monitoring : /var/log/ollama-monitor.log"
echo ""
echo "🧪 Tester l'API :"
echo "curl https://$DOMAIN/api/version"
echo ""
echo "⚙️ Commandes utiles :"
echo "- systemctl status ollama"
echo "- systemctl restart ollama"
echo "- ollama list"
echo ""
echo "🔒 Sécurité :"
echo "- Rate limiting : 5 req/s par IP"
echo "- CORS : Autorisé pour les extensions Chrome"
echo "- SSL : Let's Encrypt auto-renouvelé"
echo ""
echo "💡 Pour utiliser dans votre extension :"
echo "Changez OLLAMA_ENDPOINT dans ollama-prompt.ts :"
echo "export const OLLAMA_ENDPOINT = 'https://$DOMAIN/api/generate';"