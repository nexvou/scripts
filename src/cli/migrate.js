#!/usr/bin/env node

/**
 * CLI Tool for Database Migrations
 * Usage: node src/cli/migrate.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('../../utils/Logger');

const logger = new Logger('Migration');

async function runMigrations() {
    try {
        logger.info('🚀 Starting database migrations...');

        // Create data directory if it doesn't exist
        const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'ecommerce_coupons.db');
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Initialize database
        const db = new sqlite3.Database(dbPath);

        // Create tables one by one
        await createTables(db);
        await seedPlatforms(db);

        // Close database
        db.close();

        logger.info('✅ Migrations completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

function runQuery(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

async function createTables(db) {
    logger.info('Creating platforms table...');
    await runQuery(
        db,
        `
        CREATE TABLE IF NOT EXISTS platforms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            slug TEXT NOT NULL UNIQUE,
            base_url TEXT NOT NULL,
            logo_url TEXT,
            endpoints TEXT,
            selectors TEXT,
            limits TEXT,
            is_active BOOLEAN DEFAULT 1,
            priority INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `
    );

    logger.info('Creating merchants table...');
    await runQuery(
        db,
        `
        CREATE TABLE IF NOT EXISTS merchants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            platform_id INTEGER,
            logo_url TEXT,
            website_url TEXT,
            description TEXT,
            categories TEXT,
            is_active BOOLEAN DEFAULT 1,
            is_verified BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (platform_id) REFERENCES platforms (id) ON DELETE CASCADE
        )
    `
    );

    logger.info('Creating coupons table...');
    await runQuery(
        db,
        `
        CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            discount_type TEXT CHECK(discount_type IN ('percentage', 'fixed', 'shipping', 'cashback', 'bogo')) DEFAULT 'percentage',
            discount_value REAL,
            discount_text TEXT,
            coupon_code TEXT,
            platform_id INTEGER,
            merchant_id INTEGER,
            source_url TEXT NOT NULL,
            image_url TEXT,
            status TEXT CHECK(status IN ('active', 'expired', 'disabled', 'pending')) DEFAULT 'active',
            is_featured BOOLEAN DEFAULT 0,
            is_verified BOOLEAN DEFAULT 0,
            min_purchase REAL,
            max_discount REAL,
            usage_limit INTEGER,
            total_usage INTEGER DEFAULT 0,
            terms_conditions TEXT,
            categories TEXT,
            valid_from DATETIME,
            valid_until DATETIME,
            scraped_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (platform_id) REFERENCES platforms (id) ON DELETE CASCADE,
            FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE SET NULL
        )
    `
    );

    logger.info('Creating scrape_sessions table...');
    await runQuery(
        db,
        `
        CREATE TABLE IF NOT EXISTS scrape_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            platform_id INTEGER,
            status TEXT CHECK(status IN ('running', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
            started_at DATETIME NOT NULL,
            completed_at DATETIME,
            duration_ms INTEGER,
            items_found INTEGER DEFAULT 0,
            items_saved INTEGER DEFAULT 0,
            items_updated INTEGER DEFAULT 0,
            items_failed INTEGER DEFAULT 0,
            error_details TEXT,
            performance_metrics TEXT,
            scraper_version TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (platform_id) REFERENCES platforms (id) ON DELETE CASCADE
        )
    `
    );

    logger.info('Creating scrape_metrics table...');
    await runQuery(
        db,
        `
        CREATE TABLE IF NOT EXISTS scrape_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            platform_id INTEGER,
            total_sessions INTEGER DEFAULT 0,
            successful_sessions INTEGER DEFAULT 0,
            failed_sessions INTEGER DEFAULT 0,
            total_items_found INTEGER DEFAULT 0,
            total_items_saved INTEGER DEFAULT 0,
            total_items_updated INTEGER DEFAULT 0,
            total_items_failed INTEGER DEFAULT 0,
            average_duration_ms REAL,
            success_rate REAL,
            error_summary TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (platform_id) REFERENCES platforms (id) ON DELETE CASCADE
        )
    `
    );

    logger.info('Creating indexes...');
    await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_platforms_slug ON platforms(slug)');
    await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_platforms_is_active ON platforms(is_active)');
    await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_merchants_platform_id ON merchants(platform_id)');
    await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_merchants_slug ON merchants(slug)');
    await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_coupons_platform_id ON coupons(platform_id)');
    await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_coupons_merchant_id ON coupons(merchant_id)');
    await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status)');
    await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_coupons_scraped_at ON coupons(scraped_at)');
    await runQuery(db, 'CREATE INDEX IF NOT EXISTS idx_coupons_valid_until ON coupons(valid_until)');

    logger.info('📋 Database tables created successfully');
}

async function seedPlatforms(db) {
    logger.info('Seeding platforms...');

    const platforms = [
        { name: 'Shopee', slug: 'shopee', base_url: 'https://shopee.co.id', priority: 1 },
        { name: 'Tokopedia', slug: 'tokopedia', base_url: 'https://www.tokopedia.com', priority: 2 },
        { name: 'Lazada', slug: 'lazada', base_url: 'https://www.lazada.co.id', priority: 3 },
        { name: 'Blibli', slug: 'blibli', base_url: 'https://www.blibli.com', priority: 4 },
        { name: 'Traveloka', slug: 'traveloka', base_url: 'https://www.traveloka.com', priority: 5 },
        { name: 'Grab', slug: 'grab', base_url: 'https://www.grab.com', priority: 6 },
    ];

    for (const platform of platforms) {
        try {
            await runQuery(
                db,
                `
                INSERT OR IGNORE INTO platforms (name, slug, base_url, priority)
                VALUES (?, ?, ?, ?)
            `,
                [platform.name, platform.slug, platform.base_url, platform.priority]
            );
        } catch (error) {
            logger.warn(`Platform ${platform.name} already exists or error:`, error.message);
        }
    }

    logger.info('🏪 Platforms seeded successfully');
}

runMigrations();
