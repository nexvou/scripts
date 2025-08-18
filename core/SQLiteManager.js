const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/Logger');

class SQLiteManager {
    constructor() {
        this.logger = new Logger('SQLiteManager');
        // Use the same database path as configured in .env
        this.dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'ecommerce_coupons.db');
        this.db = null;
        this.merchantCache = new Map();
        this.initialized = false;
        this.initializing = false;
        this.initPromise = null;

        // Don't await in constructor, initialize lazily
    }

    async initializeDatabase() {
        try {
            // Create data directory if it doesn't exist
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Initialize database with error handling
            this.db = new sqlite3.Database(this.dbPath, err => {
                if (err) {
                    this.logger.error('Failed to open SQLite database:', err);
                    throw err;
                }
            });

            // Create tables
            await this.createTables();
            await this.seedPlatforms();

            this.logger.info(`SQLite database initialized at: ${this.dbPath}`);
        } catch (error) {
            this.logger.error('Failed to initialize SQLite database:', error);
            throw error;
        }
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const queries = [
                // Create platforms table
                `CREATE TABLE IF NOT EXISTS platforms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          slug TEXT NOT NULL UNIQUE,
          base_url TEXT NOT NULL,
          logo_url TEXT,
          endpoints JSON,
          selectors JSON,
          limits JSON,
          is_active BOOLEAN DEFAULT 1,
          priority INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

                // Create merchants table
                `CREATE TABLE IF NOT EXISTS merchants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          platform_id INTEGER,
          logo_url TEXT,
          website_url TEXT,
          description TEXT,
          categories JSON,
          is_active BOOLEAN DEFAULT 1,
          is_verified BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (platform_id) REFERENCES platforms (id) ON DELETE CASCADE
        )`,

                // Create coupons table
                `CREATE TABLE IF NOT EXISTS coupons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          discount_type TEXT CHECK(discount_type IN ('percentage', 'fixed', 'shipping', 'cashback', 'bogo'))
            DEFAULT 'percentage',
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
          terms_conditions JSON,
          categories JSON,
          valid_from DATETIME,
          valid_until DATETIME,
          scraped_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (platform_id) REFERENCES platforms (id) ON DELETE CASCADE,
          FOREIGN KEY (merchant_id) REFERENCES merchants (id) ON DELETE SET NULL
        )`,

                // Create scrape_sessions table
                `CREATE TABLE IF NOT EXISTS scrape_sessions (
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
          error_details JSON,
          performance_metrics JSON,
          scraper_version TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (platform_id) REFERENCES platforms (id) ON DELETE CASCADE
        )`,

                // Create scrape_metrics table
                `CREATE TABLE IF NOT EXISTS scrape_metrics (
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
          error_summary JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (platform_id) REFERENCES platforms (id) ON DELETE CASCADE
        )`,

                // Create indexes
                'CREATE INDEX IF NOT EXISTS idx_platforms_slug ON platforms(slug)',
                'CREATE INDEX IF NOT EXISTS idx_platforms_is_active ON platforms(is_active)',
                'CREATE INDEX IF NOT EXISTS idx_merchants_platform_id ON merchants(platform_id)',
                'CREATE INDEX IF NOT EXISTS idx_merchants_slug ON merchants(slug)',
                'CREATE INDEX IF NOT EXISTS idx_coupons_platform_id ON coupons(platform_id)',
                'CREATE INDEX IF NOT EXISTS idx_coupons_merchant_id ON coupons(merchant_id)',
                'CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status)',
                'CREATE INDEX IF NOT EXISTS idx_coupons_scraped_at ON coupons(scraped_at)',
                'CREATE INDEX IF NOT EXISTS idx_coupons_valid_until ON coupons(valid_until)',
            ];

            let completed = 0;
            let hasError = false;

            queries.forEach((query, index) => {
                this.db.run(query, err => {
                    if (err && !hasError) {
                        hasError = true;
                        this.logger.error(`Error creating table/index ${index}:`, err);
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === queries.length && !hasError) {
                        resolve();
                    }
                });
            });
        });
    }

    async seedPlatforms() {
        const platforms = [
            { name: 'Shopee', slug: 'shopee', base_url: 'https://shopee.co.id', priority: 1 },
            { name: 'Tokopedia', slug: 'tokopedia', base_url: 'https://www.tokopedia.com', priority: 2 },
            { name: 'Lazada', slug: 'lazada', base_url: 'https://www.lazada.co.id', priority: 3 },
            { name: 'Blibli', slug: 'blibli', base_url: 'https://www.blibli.com', priority: 4 },
            { name: 'Traveloka', slug: 'traveloka', base_url: 'https://www.traveloka.com', priority: 5 },
            { name: 'Grab', slug: 'grab', base_url: 'https://www.grab.com', priority: 6 },
        ];

        return new Promise((resolve, reject) => {
            let completed = 0;
            platforms.forEach(platform => {
                this.db.run(
                    'INSERT OR IGNORE INTO platforms (name, slug, base_url, priority) VALUES (?, ?, ?, ?)',
                    [platform.name, platform.slug, platform.base_url, platform.priority],
                    err => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        completed++;
                        if (completed === platforms.length) {
                            this.logger.info('🏪 Platforms seeded successfully');
                            resolve();
                        }
                    }
                );
            });
        });
    }

    async ensureInitialized() {
        if (this.initialized) {
            return;
        }

        // If already initializing, wait for the existing promise
        if (this.initializing && this.initPromise) {
            await this.initPromise;
            return;
        }

        // Start initialization
        this.initializing = true;
        this.initPromise = this.initializeDatabase();

        try {
            await this.initPromise;
            this.initialized = true;
        } catch (error) {
            this.initializing = false;
            this.initPromise = null;
            throw error;
        } finally {
            this.initializing = false;
        }
    }

    async testConnection() {
        await this.ensureInitialized();
        return new Promise(resolve => {
            this.db.get('SELECT COUNT(*) as count FROM merchants', (err, result) => {
                if (err) {
                    this.logger.error('Database connection test failed:', err);
                    resolve(false);
                } else {
                    resolve(result.count >= 0);
                }
            });
        });
    }

    async getMerchantId(slug) {
        await this.ensureInitialized();

        // Use cache to avoid repeated queries
        if (this.merchantCache.has(slug)) {
            return this.merchantCache.get(slug);
        }

        return new Promise(resolve => {
            this.db.get('SELECT id FROM merchants WHERE slug = ?', [slug], (err, result) => {
                if (err) {
                    this.logger.error(`Error getting merchant ID for ${slug}:`, err);
                    resolve(null);
                } else if (!result) {
                    this.logger.warn(`Merchant not found: ${slug}`);
                    resolve(null);
                } else {
                    this.merchantCache.set(slug, result.id);
                    resolve(result.id);
                }
            });
        });
    }

    async getPlatformId(slug) {
        await this.ensureInitialized();

        // Use cache to avoid repeated queries
        const cacheKey = `platform_${slug}`;
        if (this.merchantCache.has(cacheKey)) {
            return this.merchantCache.get(cacheKey);
        }

        return new Promise(resolve => {
            this.db.get('SELECT id FROM platforms WHERE slug = ?', [slug], (err, result) => {
                if (err) {
                    this.logger.error(`Error getting platform ID for ${slug}:`, err);
                    resolve(null);
                } else if (!result) {
                    this.logger.warn(`Platform not found: ${slug}`);
                    resolve(null);
                } else {
                    this.merchantCache.set(cacheKey, result.id);
                    resolve(result.id);
                }
            });
        });
    }

    async saveCoupon(couponData) {
        // Validate required fields - now we need either platform_id or merchant_id
        if (!couponData.title || (!couponData.platform_id && !couponData.merchant_id)) {
            this.logger.error('Missing required fields: title, and either platform_id or merchant_id');
            return false;
        }

        return new Promise(resolve => {
            this.db.run(
                `
        INSERT OR REPLACE INTO coupons (
          title, description, discount_type, discount_value, coupon_code,
          platform_id, merchant_id, source_url, image_url, status, is_featured,
          valid_until, scraped_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
                [
                    couponData.title,
                    couponData.description,
                    couponData.discount_type,
                    couponData.discount_value,
                    couponData.coupon_code,
                    couponData.platform_id || null,
                    couponData.merchant_id || null,
                    couponData.source_url,
                    couponData.image_url,
                    couponData.status,
                    couponData.is_featured ? 1 : 0,
                    couponData.valid_until,
                    couponData.scraped_at,
                ],
                err => {
                    if (err) {
                        this.logger.error('Error saving coupon:', err);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                }
            );
        });
    }

    async saveBatch(coupons) {
        if (!coupons.length) return { saved: 0, errors: 0 };

        let saved = 0;
        let errors = 0;

        return new Promise(resolve => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO coupons (
            title, description, discount_type, discount_value, coupon_code,
            merchant_id, source_url, image_url, status, is_featured,
            valid_until, scraped_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

                let completed = 0;
                for (const coupon of coupons) {
                    stmt.run(
                        [
                            coupon.title,
                            coupon.description,
                            coupon.discount_type,
                            coupon.discount_value,
                            coupon.coupon_code,
                            coupon.merchant_id,
                            coupon.source_url,
                            coupon.image_url,
                            coupon.status,
                            coupon.is_featured ? 1 : 0,
                            coupon.valid_until,
                            coupon.scraped_at,
                        ],
                        err => {
                            if (err) {
                                this.logger.error('Error saving coupon in batch:', err);
                                errors++;
                            } else {
                                saved++;
                            }

                            completed++;
                            if (completed === coupons.length) {
                                stmt.finalize();
                                this.db.run('COMMIT', () => {
                                    resolve({ saved, errors });
                                });
                            }
                        }
                    );
                }
            });
        });
    }

    async cleanupExpired() {
        return new Promise(resolve => {
            this.db.run(
                `
        UPDATE coupons 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE valid_until < datetime('now') AND status = 'active'
      `,
                function (err) {
                    if (err) {
                        this.logger.error('Error cleaning up expired coupons:', err);
                        resolve(0);
                    } else {
                        const count = this.changes;
                        if (count > 0) {
                            this.logger.info(`🧹 Marked ${count} coupons as expired`);
                        }
                        resolve(count);
                    }
                }
            );
        });
    }

    async updateStats() {
        try {
            // Update statistics - you can implement custom logic here
            this.logger.info('📊 Statistics updated');
            return true;
        } catch (error) {
            this.logger.error('Error updating statistics:', error);
            return false;
        }
    }

    async getCouponCount(merchantId = null) {
        return new Promise(resolve => {
            let query = 'SELECT COUNT(*) as count FROM coupons WHERE status = ?';
            const params = ['active'];

            if (merchantId) {
                query += ' AND merchant_id = ?';
                params.push(merchantId);
            }

            this.db.get(query, params, (err, result) => {
                if (err) {
                    this.logger.error('Error getting coupon count:', err);
                    resolve(0);
                } else {
                    resolve(result.count || 0);
                }
            });
        });
    }

    async getRecentCoupons(limit = 10) {
        return new Promise(resolve => {
            this.db.all(
                `
        SELECT title, merchant_id, created_at 
        FROM coupons 
        WHERE status = 'active' 
        ORDER BY created_at DESC 
        LIMIT ?
      `,
                [limit],
                (err, results) => {
                    if (err) {
                        this.logger.error('Error getting recent coupons:', err);
                        resolve([]);
                    } else {
                        resolve(results || []);
                    }
                }
            );
        });
    }

    close() {
        if (this.db) {
            this.db.close();
            this.logger.info('SQLite database connection closed');
        }
    }
}

module.exports = SQLiteManager;
