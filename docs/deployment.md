# KasGate Deployment Guide

This guide covers deploying KasGate to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Deploy (Single Server)](#quick-deploy-single-server)
- [Nginx Configuration](#nginx-configuration)
- [Docker Deployment](#docker-deployment)
- [PM2 Process Management](#pm2-process-management)
- [Database Backups](#database-backups)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: 20.x or later
- **Memory**: Minimum 512MB RAM (1GB+ recommended)
- **Disk**: 1GB+ free space for database and logs
- **OS**: Linux (Ubuntu 22.04 recommended), macOS, or Windows

### Required Software

```bash
# Node.js 20.x (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version   # Should be 10.x.x
```

### Optional but Recommended

- **nginx**: Reverse proxy with SSL termination
- **PM2**: Process manager for Node.js
- **Docker**: Container deployment

---

## Quick Deploy (Single Server)

### 1. Clone and Build

```bash
# Clone the repository
git clone https://github.com/your-org/kasgate.git
cd kasgate

# Install dependencies
npm install
cd dashboard && npm install && cd ..

# Build everything
npm run build
```

### 2. Configure Environment

```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

Essential settings:
```bash
NODE_ENV=production
KASPA_NETWORK=mainnet
PORT=3001
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. Initialize Database

```bash
# Create data directory
mkdir -p data

# The database is auto-created on first run
```

### 4. Start the Server

```bash
# Direct start (for testing)
node dist/server/index.js

# Or with PM2 (recommended)
pm2 start dist/server/index.js --name kasgate
```

### 5. Verify Deployment

```bash
# Health check
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

---

## Nginx Configuration

### Basic Configuration

Create `/etc/nginx/sites-available/kasgate`:

```nginx
server {
    listen 80;
    server_name kasgate.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name kasgate.yourdomain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/kasgate.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kasgate.yourdomain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # API and Dashboard
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

### Enable and Restart

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/kasgate /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d kasgate.yourdomain.com

# Auto-renewal is configured automatically
```

---

## Docker Deployment

### Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/
RUN npm ci
RUN cd dashboard && npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create data directory
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Start server
CMD ["node", "dist/server/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  kasgate:
    build: .
    container_name: kasgate
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - KASPA_NETWORK=mainnet
      - CORS_ALLOWED_ORIGINS=https://yourdomain.com
    volumes:
      - kasgate-data:/app/data
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  kasgate-data:
```

### Build and Run

```bash
# Build image
docker build -t kasgate:latest .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f kasgate

# Stop
docker-compose down
```

---

## PM2 Process Management

### Installation

```bash
npm install -g pm2
```

### Ecosystem File

Create `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [{
    name: 'kasgate',
    script: 'dist/server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      KASPA_NETWORK: 'mainnet'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true
  }]
};
```

### PM2 Commands

```bash
# Start
pm2 start ecosystem.config.cjs --env production

# View status
pm2 status

# View logs
pm2 logs kasgate

# Restart
pm2 restart kasgate

# Stop
pm2 stop kasgate

# Auto-start on boot
pm2 startup
pm2 save
```

---

## Database Backups

### Manual Backup

```bash
# Create backup
cp data/kasgate.db backups/kasgate-$(date +%Y%m%d-%H%M%S).db

# Compress backup
gzip backups/kasgate-*.db
```

### Automated Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/path/to/backups"
DB_PATH="/path/to/kasgate/data/kasgate.db"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kasgate-$TIMESTAMP.db"

# Copy database (SQLite supports hot copy)
cp "$DB_PATH" "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# Remove old backups
find "$BACKUP_DIR" -name "kasgate-*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

### Cron Schedule

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/kasgate/scripts/backup.sh >> /var/log/kasgate-backup.log 2>&1
```

### Remote Backup (S3)

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Add to backup script
aws s3 cp "$BACKUP_FILE.gz" "s3://your-bucket/kasgate-backups/"
```

---

## Monitoring & Health Checks

### Health Endpoint

KasGate exposes a health check endpoint:

```bash
curl http://localhost:3001/health
# {"status":"ok","timestamp":"2024-01-15T10:30:00.000Z"}
```

### Simple Monitoring Script

Create `scripts/healthcheck.sh`:

```bash
#!/bin/bash

URL="http://localhost:3001/health"
SLACK_WEBHOOK="https://hooks.slack.com/services/xxx"

response=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$response" != "200" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"KasGate health check failed!"}' \
        "$SLACK_WEBHOOK"
fi
```

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web dashboard
pm2 plus
```

### Log Rotation

Create `/etc/logrotate.d/kasgate`:

```
/path/to/kasgate/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use a different port in .env
PORT=3002
```

#### Permission Denied on Data Directory

```bash
# Fix ownership
sudo chown -R $USER:$USER data/

# Fix permissions
chmod 755 data/
chmod 644 data/kasgate.db
```

#### WebSocket Connection Failures

Check nginx configuration includes WebSocket headers:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;
```

#### Database Locked

```bash
# Check for stuck processes
fuser data/kasgate.db

# Restart server (releases lock)
pm2 restart kasgate
```

### Logs Location

- **Application logs**: `logs/out.log` (PM2) or stdout (Docker)
- **Error logs**: `logs/error.log` (PM2) or stderr (Docker)
- **Nginx logs**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

### Getting Help

1. Check application logs for errors
2. Verify environment configuration
3. Test health endpoint
4. Review nginx configuration
5. Open an issue on GitHub with logs and configuration

---

## Security Checklist

Before going live:

- [ ] `NODE_ENV=production` is set
- [ ] `KASPA_NETWORK=mainnet` for real payments
- [ ] `CORS_ALLOWED_ORIGINS` restricts to your domains
- [ ] SSL/TLS configured (HTTPS only)
- [ ] Database file has restricted permissions
- [ ] Backups are configured and tested
- [ ] Firewall allows only ports 80, 443
- [ ] Server is updated (`apt update && apt upgrade`)
- [ ] Monitoring/alerts configured
