#!/bin/bash
set -euo pipefail

# =============================================================================
# Application Setup Script - Run as 'termuser' (not root)
# =============================================================================

APP_DIR="/opt/terminal-learning"
DOMAIN="${1:-}"

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-app.sh yourdomain.com"
    exit 1
fi

echo "🚀 Setting up terminal learning app for $DOMAIN..."

cd $APP_DIR

# -----------------------------------------------------------------------------
# 1. CLONE/COPY APPLICATION
# -----------------------------------------------------------------------------
echo "📦 Setting up application files..."
# If you're deploying from git:
# git clone https://github.com/yourusername/vimux.git .
# Or copy the backend folder here

# -----------------------------------------------------------------------------
# 2. BUILD DOCKER IMAGE
# -----------------------------------------------------------------------------
echo "🐳 Building secure container image..."
docker build -t terminal-sandbox -f Dockerfile.sandbox .

# -----------------------------------------------------------------------------
# 3. NGINX CONFIGURATION
# -----------------------------------------------------------------------------
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/terminal-learning << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=ws:10m rate=10r/s;
limit_conn_zone \$binary_remote_addr zone=conn:10m;

upstream terminal_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL will be configured by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' wss://$DOMAIN; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    # WebSocket endpoint
    location /ws {
        limit_req zone=ws burst=20 nodelay;
        limit_conn conn 5;
        
        proxy_pass http://terminal_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 10s;
    }

    # Health check
    location /health {
        proxy_pass http://terminal_backend;
    }

    # Block everything else
    location / {
        return 404;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/terminal-learning /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# -----------------------------------------------------------------------------
# 4. SSL CERTIFICATE
# -----------------------------------------------------------------------------
echo "🔐 Getting SSL certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# -----------------------------------------------------------------------------
# 5. SYSTEMD SERVICE
# -----------------------------------------------------------------------------
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/terminal-learning.service << EOF
[Unit]
Description=Terminal Learning Backend
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=termuser
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3001

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
PrivateTmp=true
ReadWritePaths=$APP_DIR/logs

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable terminal-learning

# -----------------------------------------------------------------------------
# 6. LOG ROTATION
# -----------------------------------------------------------------------------
echo "📜 Setting up log rotation..."
sudo tee /etc/logrotate.d/terminal-learning << EOF
$APP_DIR/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 termuser termuser
}
EOF

# -----------------------------------------------------------------------------
# 7. CONTAINER CLEANUP CRON
# -----------------------------------------------------------------------------
echo "🧹 Setting up container cleanup..."
(crontab -l 2>/dev/null; echo "*/5 * * * * docker container prune -f --filter 'until=30m' >/dev/null 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 * * * * docker image prune -f >/dev/null 2>&1") | crontab -

# -----------------------------------------------------------------------------
# DONE
# -----------------------------------------------------------------------------
echo ""
echo "✅ Application setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy your backend code to $APP_DIR"
echo "2. npm install && npm run build"
echo "3. sudo systemctl start terminal-learning"
echo "4. Check logs: journalctl -u terminal-learning -f"
