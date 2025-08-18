# Database Schema Documentation

## Overview

The scraper uses a relational database schema optimized for storing coupon and promotion data from multiple e-commerce platforms.

## Supported Databases

- **SQLite** (default) - For development and small deployments
- **MySQL** - For production deployments
- **PostgreSQL** - For advanced features and scaling

## Schema Structure

### Tables

#### 1. `platforms`

Stores e-commerce platform information.

```sql
CREATE TABLE platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    website_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**

- `id` - Primary key
- `name` - Display name (e.g., "Shopee")
- `slug` - URL-friendly identifier (e.g., "shopee")
- `website_url` - Platform's main URL
- `is_active` - Whether platform is currently being scraped

#### 2. `merchants`

Stores merchant/brand information.

```sql
CREATE TABLE merchants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    platform_id INTEGER NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (platform_id) REFERENCES platforms (id),
    UNIQUE(slug, platform_id)
);
```

**Fields:**

- `platform_id` - Reference to platforms table
- `name` - Merchant display name
- `slug` - URL-friendly identifier
- `logo_url` - Merchant logo image URL

#### 3. `coupons`

Main table storing coupon and promotion data.

```sql
CREATE TABLE coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT CHECK(discount_type IN ('percentage', 'fixed', 'shipping', 'cashback')) DEFAULT 'percentage',
    discount_value INTEGER,
    coupon_code TEXT,
    merchant_id INTEGER NOT NULL,
    source_url TEXT,
    image_url TEXT,
    status TEXT CHECK(status IN ('active', 'expired', 'disabled')) DEFAULT 'active',
    is_featured BOOLEAN DEFAULT 0,
    valid_until DATETIME,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants (id),
    UNIQUE(title, merchant_id)
);
```

**Fields:**

- `discount_type` - Type of discount (percentage, fixed amount, etc.)
- `discount_value` - Numeric value of discount
- `coupon_code` - Promo code if applicable
- `source_url` - Original URL where coupon was found
- `valid_until` - Expiration date
- `scraped_at` - When this data was last scraped

#### 4. `scrape_sessions`

Tracks scraping sessions for monitoring.

```sql
CREATE TABLE scrape_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('running', 'completed', 'failed')) DEFAULT 'running',
    items_found INTEGER DEFAULT 0,
    items_saved INTEGER DEFAULT 0,
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration_ms INTEGER,
    FOREIGN KEY (platform_id) REFERENCES platforms (id)
);
```

#### 5. `scrape_metrics`

Aggregated metrics for performance monitoring.

```sql
CREATE TABLE scrape_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER NOT NULL,
    date DATE NOT NULL,
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    total_items_found INTEGER DEFAULT 0,
    total_items_saved INTEGER DEFAULT 0,
    avg_duration_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (platform_id) REFERENCES platforms (id),
    UNIQUE(platform_id, date)
);
```

## Indexes

For optimal performance, the following indexes are created:

```sql
-- Coupons table indexes
CREATE INDEX idx_coupons_merchant_id ON coupons(merchant_id);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_scraped_at ON coupons(scraped_at);
CREATE INDEX idx_coupons_valid_until ON coupons(valid_until);

-- Merchants table indexes
CREATE INDEX idx_merchants_platform_id ON merchants(platform_id);
CREATE INDEX idx_merchants_slug ON merchants(slug);

-- Sessions table indexes
CREATE INDEX idx_scrape_sessions_platform_id ON scrape_sessions(platform_id);
CREATE INDEX idx_scrape_sessions_started_at ON scrape_sessions(started_at);

-- Metrics table indexes
CREATE INDEX idx_scrape_metrics_platform_date ON scrape_metrics(platform_id, date);
```

## Data Types

### Discount Types

- `percentage` - Percentage discount (e.g., 20%)
- `fixed` - Fixed amount discount (e.g., Rp 50,000)
- `shipping` - Free shipping offer
- `cashback` - Cashback offer

### Status Values

- `active` - Currently valid coupon
- `expired` - Expired coupon (kept for historical data)
- `disabled` - Manually disabled coupon

## Migration Files

Database migrations are located in `/migrations/` directory:

- `001_initial_schema.sql` - Creates initial tables
- `002_add_indexes.sql` - Adds performance indexes
- `003_add_metrics.sql` - Adds metrics tracking

## Usage Examples

### Get Active Coupons by Platform

```sql
SELECT c.*, m.name as merchant_name, p.name as platform_name
FROM coupons c
JOIN merchants m ON c.merchant_id = m.id
JOIN platforms p ON m.platform_id = p.id
WHERE p.slug = 'shopee'
  AND c.status = 'active'
  AND (c.valid_until IS NULL OR c.valid_until > datetime('now'))
ORDER BY c.scraped_at DESC
LIMIT 20;
```

### Get Scraping Statistics

```sql
SELECT
    p.name as platform,
    COUNT(*) as total_coupons,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_coupons,
    MAX(c.scraped_at) as last_scraped
FROM platforms p
LEFT JOIN merchants m ON p.id = m.platform_id
LEFT JOIN coupons c ON m.id = c.merchant_id
GROUP BY p.id, p.name
ORDER BY total_coupons DESC;
```

### Performance Metrics

```sql
SELECT
    p.name as platform,
    sm.date,
    sm.successful_runs,
    sm.failed_runs,
    sm.total_items_saved,
    sm.avg_duration_ms
FROM scrape_metrics sm
JOIN platforms p ON sm.platform_id = p.id
WHERE sm.date >= date('now', '-7 days')
ORDER BY sm.date DESC, p.name;
```

## Configuration

Database configuration is handled in `/core/DatabaseManager.js`:

```javascript
// SQLite (default)
DATABASE_URL=sqlite://./data/scraper.db

// MySQL
DATABASE_URL=mysql://user:password@localhost:3306/scraper_db

// PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/scraper_db
```

## Backup and Maintenance

### SQLite Backup

```bash
# Create backup
cp data/scraper.db data/scraper_backup_$(date +%Y%m%d).db

# Vacuum database (optimize)
sqlite3 data/scraper.db "VACUUM;"
```

### MySQL Backup

```bash
mysqldump -u user -p scraper_db > backup_$(date +%Y%m%d).sql
```

### PostgreSQL Backup

```bash
pg_dump -U user scraper_db > backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### Common Issues

1. **Database locked (SQLite)**
    - Ensure no other processes are accessing the database
    - Check for long-running transactions

2. **Connection timeout**
    - Verify database server is running
    - Check connection string format

3. **Migration failures**
    - Check database permissions
    - Verify migration file syntax

### Debug Queries

```sql
-- Check database size
SELECT
    name,
    COUNT(*) as row_count
FROM (
    SELECT 'platforms' as name UNION ALL
    SELECT 'merchants' UNION ALL
    SELECT 'coupons' UNION ALL
    SELECT 'scrape_sessions' UNION ALL
    SELECT 'scrape_metrics'
) tables
JOIN (
    SELECT COUNT(*) as cnt FROM platforms UNION ALL
    SELECT COUNT(*) FROM merchants UNION ALL
    SELECT COUNT(*) FROM coupons UNION ALL
    SELECT COUNT(*) FROM scrape_sessions UNION ALL
    SELECT COUNT(*) FROM scrape_metrics
) counts;

-- Check recent activity
SELECT
    'Last scrape session' as metric,
    MAX(started_at) as value
FROM scrape_sessions
UNION ALL
SELECT
    'Total active coupons',
    COUNT(*)
FROM coupons
WHERE status = 'active';
```
