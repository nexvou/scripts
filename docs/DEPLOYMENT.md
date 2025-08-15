# Deployment Guide

## Vercel Deployment

### Prerequisites
- Vercel account
- Database setup (MySQL, PostgreSQL, or Supabase)
- Environment variables configured

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Configure Environment Variables
In your Vercel dashboard, add these environment variables:

```
NODE_ENV=production
DB_ADAPTER=supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SCRAPER_API_KEY=your-secret-api-key
SHOPEE_ENABLED=true
TOKOPEDIA_ENABLED=true
LAZADA_ENABLED=true
BLIBLI_ENABLED=true
```

### Step 4: Deploy
```bash
vercel --prod
```

### Step 5: Setup Cron Jobs
The `vercel.json` file includes cron configuration for automatic scraping every minute.

## Database Setup

### Supabase (Recommended for Vercel)
1. Create a new Supabase project
2. Run the SQL migrations in your Supabase SQL editor
3. Add environment variables to Vercel

### MySQL/PostgreSQL
1. Create database instance (AWS RDS, PlanetScale, etc.)
2. Run migrations using the CLI tool
3. Add connection details to environment variables

## Monitoring

### API Endpoints for Monitoring
- `GET /api/status` - System status
- `GET /api/coupons` - Get scraped coupons
- `POST /api/scrape/trigger` - Manual trigger

### Logs
Check Vercel function logs for scraping status and errors.

## Scaling

### Increase Scraping Frequency
Modify the cron expression in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/scrape/trigger",
      "schedule": "*/30 * * * * *"
    }
  ]
}
```

### Add More Platforms
1. Add platform configuration to `seeds/001_platforms.js`
2. Create platform-specific scraper if needed
3. Enable in environment variables