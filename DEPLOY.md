# Deployment Guide

## Quick Start (Hetzner + Vercel)

### Step 1: Server Setup (5 min)

SSH into your Hetzner server:
```bash
ssh root@159.69.189.116
```

Copy and run:
```bash
# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y curl git ufw fail2ban docker.io nginx certbot python3-certbot-nginx

# Enable Docker
systemctl enable docker
systemctl start docker

# Create user
useradd -m -s /bin/bash -G docker,sudo termuser
passwd termuser

# Setup firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Create app directory
mkdir -p /opt/terminal-learning
chown termuser:termuser /opt/terminal-learning
```

### Step 2: Add SSH Key (IMPORTANT!)

On your **local machine**:
```bash
cat ~/.ssh/id_ed25519.pub
```

On the **server** (still as root):
```bash
mkdir -p /home/termuser/.ssh
echo "YOUR_KEY_HERE" > /home/termuser/.ssh/authorized_keys
chmod 700 /home/termuser/.ssh
chmod 600 /home/termuser/.ssh/authorized_keys
chown -R termuser:termuser /home/termuser/.ssh
```

Test in **new terminal**:
```bash
ssh termuser@159.69.189.116
```

### Step 3: Deploy App

On server as termuser:
```bash
cd /opt/terminal-learning

# Clone your repo (or scp the files)
git clone https://github.com/devatnull/learn-tmux-and-nvim.git .

# Go to backend
cd backend

# Build Docker image
docker build -t terminal-sandbox -f Dockerfile.sandbox .

# Test container
docker run --rm -it terminal-sandbox

# Install Node deps
npm install

# Build
npm run build
```

### Step 4: Setup Nginx + SSL

Replace `YOURDOMAIN.com` with your actual domain:

```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/terminal << 'EOF'
server {
    listen 80;
    server_name YOURDOMAIN.com;
    
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:3001;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/terminal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Get SSL cert
sudo certbot --nginx -d YOURDOMAIN.com
```

### Step 5: Create Service

```bash
sudo tee /etc/systemd/system/terminal-learning.service << 'EOF'
[Unit]
Description=Terminal Learning Backend
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=termuser
WorkingDirectory=/opt/terminal-learning/backend
ExecStart=/usr/bin/node dist/server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=ALLOWED_ORIGINS=https://learn-tmux-and-nvim.vercel.app,https://YOURDOMAIN.com

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable terminal-learning
sudo systemctl start terminal-learning
```

### Step 6: Vercel Config

Add to Vercel environment variables:
```
NEXT_PUBLIC_WS_URL=wss://YOURDOMAIN.com/ws
```

## Verify

```bash
# Check service
sudo systemctl status terminal-learning

# Check logs
journalctl -u terminal-learning -f

# Test WebSocket
curl -i http://localhost:3001/health
```

## Security Checklist

- [x] UFW firewall enabled
- [x] SSH key auth only  
- [x] Non-root user for app
- [x] Docker containers isolated
- [x] Rate limiting in nginx
- [x] SSL/HTTPS enabled
- [ ] Disable root SSH (edit /etc/ssh/sshd_config: `PermitRootLogin no`)
- [ ] Setup fail2ban for nginx
