#!/bin/bash
set -euo pipefail

# =============================================================================
# Hetzner Ubuntu 24.04 LTS - Secure Setup Script
# Run as root: curl -sSL <url> | bash
# =============================================================================

echo "🔒 Starting secure server setup..."

# -----------------------------------------------------------------------------
# 1. SYSTEM UPDATE
# -----------------------------------------------------------------------------
echo "📦 Updating system packages..."
apt update && apt upgrade -y
apt install -y \
    curl \
    wget \
    git \
    ufw \
    fail2ban \
    unattended-upgrades \
    apt-listchanges \
    nginx \
    certbot \
    python3-certbot-nginx \
    htop \
    ncdu

# -----------------------------------------------------------------------------
# 2. CREATE NON-ROOT USER
# -----------------------------------------------------------------------------
echo "👤 Creating service user..."
USERNAME="termuser"
if ! id "$USERNAME" &>/dev/null; then
    useradd -m -s /bin/bash "$USERNAME"
    usermod -aG sudo "$USERNAME"
    echo "⚠️  Set password for $USERNAME:"
    passwd "$USERNAME"
fi

# -----------------------------------------------------------------------------
# 3. SSH HARDENING
# -----------------------------------------------------------------------------
echo "🔐 Hardening SSH..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

cat > /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
# Disable root login
PermitRootLogin no

# Disable password auth (use keys only)
PasswordAuthentication no
PubkeyAuthentication yes

# Other hardening
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers termuser

# Use strong ciphers only
Ciphers aes256-gcm@openssh.com,chacha20-poly1305@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512
EOF

echo "⚠️  IMPORTANT: Add your SSH public key to /home/$USERNAME/.ssh/authorized_keys"
echo "   Before logging out, test SSH access as $USERNAME!"
mkdir -p /home/$USERNAME/.ssh
chmod 700 /home/$USERNAME/.ssh
touch /home/$USERNAME/.ssh/authorized_keys
chmod 600 /home/$USERNAME/.ssh/authorized_keys
chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh

# -----------------------------------------------------------------------------
# 4. FIREWALL (UFW)
# -----------------------------------------------------------------------------
echo "🧱 Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
ufw status verbose

# -----------------------------------------------------------------------------
# 5. FAIL2BAN
# -----------------------------------------------------------------------------
echo "🚫 Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
banaction = ufw

[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 24h
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# -----------------------------------------------------------------------------
# 6. AUTOMATIC SECURITY UPDATES
# -----------------------------------------------------------------------------
echo "🔄 Enabling automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

# -----------------------------------------------------------------------------
# 7. INSTALL DOCKER
# -----------------------------------------------------------------------------
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USERNAME

# Docker security daemon config
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
    "live-restore": true,
    "userland-proxy": false,
    "no-new-privileges": true,
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}
EOF

systemctl restart docker
systemctl enable docker

# -----------------------------------------------------------------------------
# 8. INSTALL NODE.JS
# -----------------------------------------------------------------------------
echo "📦 Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# -----------------------------------------------------------------------------
# 9. KERNEL HARDENING
# -----------------------------------------------------------------------------
echo "🛡️ Applying kernel hardening..."
cat > /etc/sysctl.d/99-security.conf << 'EOF'
# IP Spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP broadcast requests
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Disable source packet routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Block SYN attacks
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2

# Log Martians
net.ipv4.conf.all.log_martians = 1

# Disable IPv6 if not needed
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
EOF

sysctl -p /etc/sysctl.d/99-security.conf

# -----------------------------------------------------------------------------
# 10. CREATE APP DIRECTORY
# -----------------------------------------------------------------------------
echo "📁 Creating application directory..."
mkdir -p /opt/terminal-learning
chown -R $USERNAME:$USERNAME /opt/terminal-learning

# -----------------------------------------------------------------------------
# DONE
# -----------------------------------------------------------------------------
echo ""
echo "✅ Base setup complete!"
echo ""
echo "⚠️  CRITICAL NEXT STEPS:"
echo "1. Add your SSH public key to /home/$USERNAME/.ssh/authorized_keys"
echo "2. Test SSH login as '$USERNAME' in a NEW terminal"
echo "3. Only then, restart SSH: systemctl restart sshd"
echo "4. Run the app setup script as '$USERNAME'"
echo ""
echo "📊 Server status:"
ufw status
systemctl status fail2ban --no-pager
docker --version
node --version
