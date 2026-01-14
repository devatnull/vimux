# Deployment Guide

This guide covers deploying Vimux with Vercel (frontend) and Hetzner (backend).

## Architecture

```
vimux.dev (Vercel)          api.vimux.dev (Hetzner)
   Next.js frontend   --->     WebSocket server
   Static hosting              Docker containers
                               Real neovim + tmux
```

## Prerequisites

- Vercel account
- Hetzner Cloud account (CX23 or higher)
- Domain pointing to both services

## DNS Configuration

| Record | Type | Value |
|--------|------|-------|
| @ | CNAME | cname.vercel-dns.com |
| www | CNAME | cname.vercel-dns.com |
| api | A | YOUR_SERVER_IP |

## Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Add environment variable: `NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws`
3. Deploy

## Backend (Hetzner)

### Server Setup

SSH into your server as root:

```bash
ssh root@YOUR_SERVER_IP
```

Run the setup:

```bash
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban docker.io nginx certbot python3-certbot-nginx

systemctl enable docker && systemctl start docker

useradd -m -s /bin/bash -G docker,sudo termuser
passwd termuser

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

mkdir -p /opt/vimux
chown termuser:termuser /opt/vimux
```

### Application Setup

Switch to termuser:

```bash
su - termuser
cd /opt/vimux
```

Clone and build:

```bash
git clone https://github.com/devatnull/vimux.git .
cd backend
docker build -t terminal-sandbox -f Dockerfile.sandbox .
npm install
npm run build
```

Create environment file:

```bash
cat > .env << 'EOF'
PORT=3001
MAX_SESSIONS=15
SESSION_TIMEOUT=1800000
IDLE_TIMEOUT=300000
ALLOWED_ORIGINS=https://vimux.dev,https://www.vimux.dev
EOF
```

### Nginx Configuration

As root, create `/etc/nginx/sites-available/vimux`:

```nginx
server {
    server_name api.yourdomain.com;

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /stats {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

Enable and get SSL:

```bash
ln -sf /etc/nginx/sites-available/vimux /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
certbot --nginx -d api.yourdomain.com
```

### Systemd Service

Create `/etc/systemd/system/vimux.service`:

```ini
[Unit]
Description=Vimux Terminal Backend
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=termuser
WorkingDirectory=/opt/vimux/backend
EnvironmentFile=/opt/vimux/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Start the service:

```bash
systemctl daemon-reload
systemctl enable vimux
systemctl start vimux
```

### Verification

```bash
systemctl status vimux
curl http://localhost:3001/health
journalctl -u vimux -f
```

## Security Checklist

- UFW firewall enabled (ports 22, 80, 443 only)
- Fail2ban active for SSH protection
- Non-root user for application
- Docker containers run with no network access
- SSL/HTTPS enforced
- Rate limiting in nginx

## Updating

```bash
cd /opt/vimux
git pull
cd backend
npm install
npm run build
sudo systemctl restart vimux
```

If Dockerfile changed:

```bash
docker build -t terminal-sandbox -f Dockerfile.sandbox .
sudo systemctl restart vimux
```

## Monitoring

View logs:

```bash
journalctl -u vimux -f
```

Check active sessions:

```bash
curl http://localhost:3001/stats
```

Docker container status:

```bash
docker ps
docker stats
```
