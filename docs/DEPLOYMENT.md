# 🚀 Deployment Guide

Panduan lengkap untuk deploy sistem scraper Kupon.id ke production.

## 📋 Daftar Isi

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Production Deployment](#production-deployment)
- [Process Management](#process-management)
- [Monitoring](#monitoring)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: >= 18.0.0
- **NPM**: >= 8.0.0
- **Memory**: Minimum 2GB RAM
- **Storage**: Minimum 10GB free space
- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+

### Dependencies

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
  gconf-service libasound2-dev libatk1.0-dev \
  libatk-bridge2.0-dev libc6-dev libcairo2-dev \
  libcups2-dev libdbus-1-dev libexpat1-dev \
  libfontconfig1-dev libgcc1 libgconf-2-4 \
  libgdk-pixbuf2.0-dev libglib2.0-dev libgtk-3-dev \
  libnspr4-dev libpango-1.0-dev libpangocairo-1.0-dev \
  libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
  libxcomposite1 libxcursor1 libxdamage1 libxext6 \
  libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
  libxtst6 ca-certificates fonts-liberation \
  libappindicator1 libnss3 lsb-release xdg-utils wget

# CentOS/RHEL
sudo yum install -y \
  alsa-lib atk cups-libs gtk3 ipa-gothic-fonts \
  libdrm libX11 libXcomposite libXcursor libXdamage \
  libXext libXi libXrandr libXScrnSaver libXtst \
  pango xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi \
  xorg-x11-fonts-cyrillic xorg-x11-fonts-misc \
  xorg-x11-fonts-Type1 xorg-x11-utils
```

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/nexvou/scripts.git
cd scripts
```

### 2. Install Dependencies

```bash
npm install --production
```

### 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` file:

```bash
# Production Environment
NODE_ENV=production
DEBUG=false

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Scraper Settings
SCRAPER_HEADLESS=true
SCRAPER_TIMEOUT=30000
SCRAPER_MAX_ITEMS=50
SCRAPER_DELAY=2000

# Rate Limiting
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=60000

# Logging
LOG_LEVEL=info
```

### 4. Test Installation

```bash
npm test
```

## Production Deployment

### Option 1: PM2 (Recommended)

#### Install PM2

```bash
npm install -g pm2
```

#### Create PM2 Ecosystem File

```javascript
// ecosystem.config.js
module.exports = {
    apps: [
        {
            name: 'kupon-scraper',
            script: './index.js',
            args: '--schedule',
            instances: 1,
            exec_mode: 'fork',
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
            },
            error_file: './logs/err.log',
            out_file: './logs/out.log',
            log_file: './logs/combined.log',
            time: true,
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
        },
    ],
};
```

#### Start with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### PM2 Commands

```bash
# Status
pm2 status

# Logs
pm2 logs kupon-scraper

# Restart
pm2 restart kupon-scraper

# Stop
pm2 stop kupon-scraper

# Delete
pm2 delete kupon-scraper
```

### Option 2: Docker

#### Dockerfile

```dockerfile
FROM node:18-alpine

# Install dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to skip installing Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "run", "scrape:schedule"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
    kupon-scraper:
        build: .
        restart: unless-stopped
        environment:
            - NODE_ENV=production
            - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
            - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_KEY}
        volumes:
            - ./logs:/app/logs
        mem_limit: 1g
        cpus: 0.5
```

#### Run with Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 3: Systemd Service

#### Create Service File

```bash
sudo nano /etc/systemd/system/kupon-scraper.service
```

```ini
[Unit]
Description=Kupon.id Scraper Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/scripts
ExecStart=/usr/bin/node index.js --schedule
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=kupon-scraper

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable kupon-scraper
sudo systemctl start kupon-scraper

# Check status
sudo systemctl status kupon-scraper

# View logs
sudo journalctl -u kupon-scraper -f
```

## Process Management

### Health Checks

```bash
# Create health check script
cat > health-check.sh << 'EOF'
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ $response -eq 200 ]; then
    echo "Service is healthy"
    exit 0
else
    echo "Service is unhealthy"
    exit 1
fi
EOF

chmod +x health-check.sh
```

### Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/kupon-scraper
```

```
/home/ubuntu/scripts/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reload kupon-scraper
    endscript
}
```

## Monitoring

### Basic Monitoring Script

```bash
#!/bin/bash
# monitor.sh

LOG_FILE="/var/log/kupon-scraper-monitor.log"
SERVICE_NAME="kupon-scraper"

check_service() {
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        echo "$(date): Service is running" >> $LOG_FILE
        return 0
    else
        echo "$(date): Service is down, restarting..." >> $LOG_FILE
        pm2 restart $SERVICE_NAME
        return 1
    fi
}

check_memory() {
    MEMORY_USAGE=$(pm2 show $SERVICE_NAME | grep "memory usage" | awk '{print $4}' | sed 's/M//')
    if [ "$MEMORY_USAGE" -gt 800 ]; then
        echo "$(date): High memory usage: ${MEMORY_USAGE}M, restarting..." >> $LOG_FILE
        pm2 restart $SERVICE_NAME
    fi
}

check_service
check_memory
```

### Cron Job for Monitoring

```bash
# Add to crontab
crontab -e

# Check every 5 minutes
*/5 * * * * /home/ubuntu/scripts/monitor.sh
```

### Alerting with Webhook

```javascript
// alert.js
const axios = require('axios');

async function sendAlert(message) {
    try {
        await axios.post('YOUR_WEBHOOK_URL', {
            text: `🚨 Kupon Scraper Alert: ${message}`,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Failed to send alert:', error);
    }
}

module.exports = { sendAlert };
```

## Scaling

### Horizontal Scaling

```javascript
// ecosystem.config.js - Multiple instances
module.exports = {
    apps: [
        {
            name: 'kupon-scraper-shopee',
            script: './index.js',
            args: '--single shopee --schedule',
            instances: 1,
        },
        {
            name: 'kupon-scraper-tokopedia',
            script: './index.js',
            args: '--single tokopedia --schedule',
            instances: 1,
        },
    ],
};
```

### Load Balancing

```nginx
# nginx.conf
upstream kupon_scrapers {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name scraper.kupon.id;

    location / {
        proxy_pass http://kupon_scrapers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Connection Pooling

```javascript
// Enhanced DatabaseManager for production
class DatabaseManager {
    constructor() {
        this.supabase = createClient(url, key, {
            db: {
                schema: 'public',
            },
            auth: {
                autoRefreshToken: true,
                persistSession: false,
            },
            global: {
                headers: { 'x-my-custom-header': 'kupon-scraper' },
            },
        });
    }
}
```

## Security

### Environment Security

```bash
# Set proper file permissions
chmod 600 .env
chown ubuntu:ubuntu .env

# Use secrets management
# AWS Secrets Manager, HashiCorp Vault, etc.
```

### Network Security

```bash
# Firewall rules
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000  # Don't expose scraper port
sudo ufw enable
```

### Process Security

```bash
# Run as non-root user
sudo useradd -m -s /bin/bash scraper
sudo su - scraper
```

## Backup and Recovery

### Database Backup

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/kupon-scraper"

mkdir -p $BACKUP_DIR

# Backup configuration
cp .env $BACKUP_DIR/env_$DATE
cp ecosystem.config.js $BACKUP_DIR/ecosystem_$DATE.js

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz logs/

echo "Backup completed: $DATE"
```

### Recovery Procedure

1. Stop the service
2. Restore configuration files
3. Install dependencies
4. Start the service
5. Verify functionality

## Performance Optimization

### Node.js Optimization

```bash
# Increase memory limit
node --max-old-space-size=2048 index.js

# Enable V8 optimizations
node --optimize-for-size index.js
```

### System Optimization

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize TCP settings
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
sysctl -p
```

## Troubleshooting

### Common Issues

#### 1. Browser Launch Fails

```bash
# Install missing dependencies
sudo apt-get install -y libgbm-dev

# Check Chrome/Chromium installation
which google-chrome || which chromium-browser
```

#### 2. Memory Issues

```bash
# Monitor memory usage
pm2 monit

# Increase swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 3. Database Connection Issues

```bash
# Test connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('merchants').select('count').limit(1).then(console.log);
"
```

#### 4. Rate Limiting Issues

- Adjust rate limits in config
- Implement exponential backoff
- Use proxy rotation if needed

### Log Analysis

```bash
# Find errors in logs
grep -i error logs/*.log

# Monitor real-time logs
tail -f logs/combined.log | grep -i error

# Analyze performance
grep "Scraping Summary" logs/*.log | tail -10
```

## Maintenance

### Regular Tasks

- Update dependencies monthly
- Review and rotate logs weekly
- Monitor disk space daily
- Check error rates daily
- Update selectors when websites change

### Update Procedure

```bash
# 1. Backup current version
cp -r /current/path /backup/path

# 2. Pull updates
git pull origin main

# 3. Install dependencies
npm install --production

# 4. Test
npm test

# 5. Restart service
pm2 restart kupon-scraper

# 6. Monitor
pm2 logs kupon-scraper
```
