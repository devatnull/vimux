# Terminal Learning Backend

Secure backend server that provides real neovim + tmux terminals via WebSocket.

## Architecture

```
Vercel (frontend)
       ↓ WebSocket
Hetzner VPS (Ubuntu 24.04)
├── Nginx (SSL termination, rate limiting)
├── Node.js PTY server (port 3001)
└── Docker containers (per user)
    ├── No internet access
    ├── Read-only filesystem  
    ├── 256MB memory limit
    ├── 0.5 CPU limit
    └── neovim + tmux
```

## Deployment

### 1. Initial Server Setup (as root)

SSH into your Hetzner server:
```bash
ssh root@YOUR_SERVER_IP
```

Run the setup script:
```bash
# Download and run setup script
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/backend/deploy/setup-ubuntu.sh | bash

# Or copy the script manually and run it:
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

### 2. Add Your SSH Key (CRITICAL!)

Before logging out, add your SSH public key:
```bash
# On your LOCAL machine, copy your public key:
cat ~/.ssh/id_ed25519.pub

# On the SERVER, paste it:
echo "YOUR_PUBLIC_KEY_HERE" >> /home/termuser/.ssh/authorized_keys
```

Test SSH access in a NEW terminal:
```bash
ssh termuser@YOUR_SERVER_IP
```

Only if that works, restart SSH:
```bash
sudo systemctl restart sshd
```

### 3. Deploy Application (as termuser)

```bash
ssh termuser@YOUR_SERVER_IP

cd /opt/terminal-learning

# Clone repo (or copy files)
git clone https://github.com/YOUR_REPO.git .

# Or upload backend files:
# scp -r backend/* termuser@YOUR_SERVER_IP:/opt/terminal-learning/

# Build Docker image
docker build -t terminal-sandbox -f Dockerfile.sandbox .

# Install dependencies
npm install

# Build TypeScript
npm run build

# Setup nginx and SSL (replace with your domain)
chmod +x deploy/setup-app.sh
./deploy/setup-app.sh yourdomain.com

# Start the service
sudo systemctl start terminal-learning
sudo systemctl status terminal-learning
```

### 4. Update Vercel Environment

Add to your Vercel project:
```
NEXT_PUBLIC_WS_URL=wss://yourdomain.com/ws
```

## Security Features

- **Network isolation**: Containers have no internet access
- **Resource limits**: 256MB RAM, 0.5 CPU, 50 process limit
- **Read-only filesystem**: Only /tmp and user home are writable
- **No root access**: Containers run as unprivileged user
- **Rate limiting**: Connection limits per IP
- **Session timeouts**: 30 min max, 5 min idle
- **Input sanitization**: Blocks dangerous commands
- **Fail2ban**: SSH brute force protection
- **UFW firewall**: Only ports 22, 80, 443 open
- **Auto-updates**: Unattended security updates enabled

## Monitoring

```bash
# View logs
journalctl -u terminal-learning -f

# Check container stats
docker stats

# Active sessions
curl http://localhost:3001/stats

# Server status
htop
```

## Troubleshooting

**Container won't start:**
```bash
docker logs $(docker ps -lq)
docker run --rm -it terminal-sandbox /bin/bash
```

**WebSocket connection fails:**
```bash
# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Check SSL
sudo certbot certificates
```

**High memory usage:**
```bash
# Force cleanup old containers
docker container prune -f
docker image prune -f
```

## Updating

```bash
cd /opt/terminal-learning
git pull

# Rebuild container if Dockerfile changed
docker build -t terminal-sandbox -f Dockerfile.sandbox .

# Rebuild server
npm run build

# Restart
sudo systemctl restart terminal-learning
```
