# 🔧 Troubleshooting Guide

Panduan lengkap untuk mengatasi masalah umum pada sistem scraper Kupon.id.

## 📋 Daftar Isi

- [Installation Issues](#installation-issues)
- [Browser Issues](#browser-issues)
- [Database Issues](#database-issues)
- [Scraping Issues](#scraping-issues)
- [Performance Issues](#performance-issues)
- [Network Issues](#network-issues)
- [Deployment Issues](#deployment-issues)

## Installation Issues

### Node.js Version Mismatch

**Error**: `engine "node" is incompatible`

**Solution**:

```bash
# Check current version
node --version

# Install correct version using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### NPM Permission Issues

**Error**: `EACCES: permission denied`

**Solution**:

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Or use npx instead
npx kupon-scraper --test
```

### Missing Dependencies

**Error**: `Cannot find module 'puppeteer'`

**Solution**:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or install specific dependency
npm install puppeteer
```

## Browser Issues

### Puppeteer Launch Failed

**Error**: `Failed to launch the browser process`

**Solution Ubuntu/Debian**:

```bash
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
```

**Solution CentOS/RHEL**:

```bash
sudo yum install -y \
  alsa-lib atk cups-libs gtk3 ipa-gothic-fonts \
  libdrm libX11 libXcomposite libXcursor libXdamage \
  libXext libXi libXrandr libXScrnSaver libXtst \
  pango xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi \
  xorg-x11-fonts-cyrillic xorg-x11-fonts-misc \
  xorg-x11-fonts-Type1 xorg-x11-utils
```

### Chrome/Chromium Not Found

**Error**: `Could not find expected browser (chrome) locally`

**Solution**:

```bash
# Install Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Or use Chromium
sudo apt-get install -y chromium-browser

# Set executable path
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
```

### Headless Mode Issues

**Error**: Browser crashes in headless mode

**Solution**:

```bash
# Add to browser launch args
--disable-dev-shm-usage
--disable-setuid-sandbox
--no-sandbox
--disable-gpu

# Or run in non-headless mode for debugging
SCRAPER_HEADLESS=false npm run scrape:shopee
```

### Memory Issues with Browser

**Error**: `Navigation timeout exceeded`

**Solution**:

```javascript
// Increase timeout in config
timeout: 60000

// Add memory management
--max-old-space-size=2048
--disable-background-timer-throttling
```

## Database Issues

### Supabase Connection Failed

**Error**: `Database connection test failed`

**Solution**:

```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection manually
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
client.from('merchants').select('count').limit(1)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
"
```

### Invalid API Key

**Error**: `Invalid API key`

**Solution**:

1. Check Supabase dashboard for correct keys
2. Ensure using service role key, not anon key
3. Verify key hasn't expired
4. Check for extra spaces in .env file

### Table Not Found

**Error**: `relation "merchants" does not exist`

**Solution**:

```sql
-- Create merchants table
CREATE TABLE merchants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample merchants
INSERT INTO merchants (name, slug) VALUES
('Shopee', 'shopee'),
('Tokopedia', 'tokopedia'),
('Lazada', 'lazada'),
('Blibli', 'blibli'),
('Traveloka', 'traveloka'),
('Grab', 'grab');
```

### RLS (Row Level Security) Issues

**Error**: `new row violates row-level security policy`

**Solution**:

```sql
-- Disable RLS for service role
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;

-- Or create proper RLS policy
CREATE POLICY "Service role can insert" ON coupons
  FOR INSERT TO service_role
  WITH CHECK (true);
```

## Scraping Issues

### No Items Found

**Error**: `Extracted 0 items from platform`

**Debugging Steps**:

```bash
# Run in non-headless mode to see what's happening
SCRAPER_HEADLESS=false DEBUG=true npm run scrape:shopee

# Check if selectors are still valid
# Websites often change their HTML structure
```

**Solution**:

1. Update CSS selectors in config
2. Check if website has anti-bot protection
3. Verify URLs are still accessible
4. Add more fallback selectors

### Selectors Not Working

**Error**: Items found but data extraction fails

**Debugging**:

```javascript
// Add debug logging in scraper
console.log('Containers found:', containers.length);
console.log('First container HTML:', containers[0]?.innerHTML);
```

**Solution**:

```javascript
// Update selectors in config/scraper.config.js
selectors: {
  flashSale: {
    container: '.new-selector, .old-selector', // Multiple fallbacks
    title: '.new-title-selector',
    // ...
  }
}
```

### Anti-Bot Detection

**Error**: `Blocked by anti-bot protection`

**Solution**:

```javascript
// Enhance anti-bot handling
async handleAntiBot(page) {
  // Wait longer
  await this.delay(10000);

  // Check for specific anti-bot elements
  const blocked = await page.$('.blocked-message');
  if (blocked) {
    throw new Error('Blocked by anti-bot');
  }
}
```

### Rate Limiting

**Error**: `Too many requests`

**Solution**:

```javascript
// Adjust rate limits in config
const limits = {
    shopee: { requests: 5, window: 60000 }, // Reduce from 10 to 5
    // ...
};

// Add random delays
await this.delay(2000 + Math.random() * 3000);
```

### Timeout Issues

**Error**: `Navigation timeout exceeded`

**Solution**:

```javascript
// Increase timeouts
timeout: 60000, // Increase from 30000

// Use different wait strategies
waitUntil: 'domcontentloaded', // Instead of 'networkidle2'

// Add retry logic
for (let i = 0; i < 3; i++) {
  try {
    await page.goto(url, { timeout: 30000 });
    break;
  } catch (error) {
    if (i === 2) throw error;
    await this.delay(5000);
  }
}
```

## Performance Issues

### High Memory Usage

**Error**: `JavaScript heap out of memory`

**Solution**:

```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 index.js

# Monitor memory usage
pm2 monit

# Add memory restart in PM2
max_memory_restart: '1G'
```

### Slow Scraping

**Issue**: Scraping takes too long

**Solution**:

```javascript
// Optimize browser settings
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request', req => {
    // Block unnecessary resources
    if (['stylesheet', 'font', 'image'].includes(req.resourceType())) {
        req.abort();
    } else {
        req.continue();
    }
});

// Reduce wait times
await this.delay(1000); // Reduce from 3000

// Limit items per scrape
maxItems: 20; // Reduce from 50
```

### CPU Usage High

**Issue**: High CPU consumption

**Solution**:

```bash
# Limit CPU usage with PM2
pm2 start ecosystem.config.js --node-args="--max-old-space-size=1024"

# Use process priority
nice -n 10 node index.js

# Reduce concurrent operations
instances: 1 // Instead of multiple instances
```

## Network Issues

### DNS Resolution Failed

**Error**: `getaddrinfo ENOTFOUND`

**Solution**:

```bash
# Check DNS
nslookup shopee.co.id

# Use different DNS
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Add to /etc/hosts if needed
echo "104.16.0.1 shopee.co.id" | sudo tee -a /etc/hosts
```

### SSL Certificate Issues

**Error**: `certificate verify failed`

**Solution**:

```javascript
// Ignore SSL errors (not recommended for production)
await page.goto(url, {
  waitUntil: 'networkidle2',
  timeout: 30000,
  ignoreHTTPSErrors: true
});

// Or update certificates
sudo apt-get update && sudo apt-get install ca-certificates
```

### Proxy Issues

**Error**: Connection through proxy fails

**Solution**:

```javascript
// Configure proxy in browser
const browser = await puppeteer.launch({
    args: ['--proxy-server=http://proxy-server:port', '--no-sandbox'],
});

// Or use different proxy
const proxyList = ['proxy1:port', 'proxy2:port'];
const proxy = proxyList[Math.floor(Math.random() * proxyList.length)];
```

## Deployment Issues

### PM2 Not Starting

**Error**: `PM2 process not found`

**Solution**:

```bash
# Check PM2 status
pm2 status

# Restart PM2
pm2 kill
pm2 start ecosystem.config.js

# Check logs
pm2 logs --lines 50
```

### Service Not Auto-Starting

**Error**: Service doesn't start on boot

**Solution**:

```bash
# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions provided by PM2
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Docker Issues

**Error**: Container fails to start

**Solution**:

```bash
# Check Docker logs
docker logs container-name

# Debug container
docker run -it --entrypoint /bin/sh image-name

# Check resource limits
docker stats
```

### Permission Issues

**Error**: `EACCES: permission denied`

**Solution**:

```bash
# Fix file permissions
sudo chown -R ubuntu:ubuntu /path/to/scripts
chmod +x bin/cli.js

# Fix log directory permissions
mkdir -p logs
chmod 755 logs
```

## General Debugging

### Enable Debug Mode

```bash
# Set debug environment
DEBUG=true NODE_ENV=development npm run scrape:shopee

# Or use debug module
DEBUG=scraper:* npm run scrape
```

### Logging Analysis

```bash
# Find errors
grep -i error logs/*.log | tail -20

# Monitor real-time
tail -f logs/combined.log

# Analyze patterns
awk '/ERROR/ {print $1, $2}' logs/*.log | sort | uniq -c
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

echo "=== Kupon Scraper Health Check ==="

# Check Node.js
echo "Node.js version: $(node --version)"

# Check dependencies
echo "Checking dependencies..."
npm list --depth=0 2>/dev/null | grep -E "(puppeteer|supabase)"

# Check environment
echo "Environment variables:"
echo "NODE_ENV: $NODE_ENV"
echo "SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:20}..."

# Check database connection
echo "Testing database connection..."
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('merchants').select('count').limit(1)
  .then(() => console.log('✅ Database: OK'))
  .catch(() => console.log('❌ Database: FAILED'));
"

# Check browser
echo "Testing browser..."
node -e "
const puppeteer = require('puppeteer');
puppeteer.launch({headless: true})
  .then(browser => {
    console.log('✅ Browser: OK');
    return browser.close();
  })
  .catch(() => console.log('❌ Browser: FAILED'));
"

echo "=== Health Check Complete ==="
```

### Performance Monitoring

```bash
#!/bin/bash
# monitor-performance.sh

echo "=== Performance Monitor ==="

# Memory usage
echo "Memory usage:"
free -h

# Disk usage
echo "Disk usage:"
df -h

# CPU usage
echo "CPU usage:"
top -bn1 | grep "Cpu(s)"

# Process info
echo "Scraper processes:"
ps aux | grep -E "(node|scraper)" | grep -v grep

# Network connections
echo "Network connections:"
netstat -an | grep :80 | wc -l

echo "=== Monitor Complete ==="
```

## Getting Help

### Log Collection

Before asking for help, collect these logs:

```bash
# System info
uname -a > debug-info.txt
node --version >> debug-info.txt
npm --version >> debug-info.txt

# Application logs
cp logs/*.log debug-logs/
cp .env.example debug-logs/env-template

# System logs
journalctl -u kupon-scraper --since "1 hour ago" > debug-logs/system.log

# Create archive
tar -czf debug-$(date +%Y%m%d_%H%M%S).tar.gz debug-logs/
```

### Support Channels

1. **GitHub Issues**: For bugs and feature requests
2. **Documentation**: Check all docs files first
3. **Community**: Discord/Slack channels
4. **Email**: Direct support for critical issues

### Information to Include

- Operating system and version
- Node.js and npm versions
- Error messages (full stack trace)
- Steps to reproduce
- Expected vs actual behavior
- Configuration (without sensitive data)
