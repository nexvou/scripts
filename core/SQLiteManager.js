const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const Logger = require('../utils/Logger');

class SQLiteManager {
    constructor() {
        this.logger = new Logger('SQLiteManager');
        this.dbPath = path.join(process.cwd(), 'data', 'scraper.db');
        this.db = null;
        this.merchantCache = new Map();
        this.initialized = false;

        // Don't await in constructor, initialize lazily
    }

    async initializeDatabase() {
        try {
            // Create data directory if it doesn't exist
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Initialize database
            this.db = new sqlite3.Database(this.dbPath);

            // Create tables
            await this.createTables();
            await this.seedMerchants();

            this.logger.info(`SQLite database initialized at: ${this.dbPath}`);
        } catch (error) {
            this.logger.error('Failed to initialize SQLite database:', error);
            throw error;
        }
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            const queries = [
                // Create merchants table
                `CREATE TABLE IF NOT EXISTS merchants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          logo_url TEXT,
          website_url TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

                // Create coupons table
                `CREATE TABLE IF NOT EXISTS coupons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          discount_type TEXT CHECK(discount_type IN ('percentage', 'fixed', 'shipping', 'cashback'))
            DEFAULT 'percentage',
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
        )`,

                // Create indexes
                'CREATE INDEX IF NOT EXISTS idx_coupons_merchant_id ON coupons(merchant_id)',
                'CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status)',
                'CREATE INDEX IF NOT EXISTS idx_coupons_valid_until ON coupons(valid_until)',
                'CREATE INDEX IF NOT EXISTS idx_merchants_slug ON merchants(slug)',
            ];

            let completed = 0;
            queries.forEach(query => {
                this.db.run(query, err => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === queries.length) {
                        resolve();
                    }
                });
            });
        });
    }

    async seedMerchants() {
        const merchants = [
            { name: 'Shopee', slug: 'shopee', website_url: 'https://shopee.co.id' },
            { name: 'Tokopedia', slug: 'tokopedia', website_url: 'https://www.tokopedia.com' },
            { name: 'Lazada', slug: 'lazada', website_url: 'https://www.lazada.co.id' },
            { name: 'Blibli', slug: 'blibli', website_url: 'https://www.blibli.com' },
            { name: 'Traveloka', slug: 'traveloka', website_url: 'https://www.traveloka.com' },
            { name: 'Grab', slug: 'grab', website_url: 'https://www.grab.com' },
        ];

        return new Promise((resolve, reject) => {
            let completed = 0;
            merchants.forEach(merchant => {
                this.db.run(
                    'INSERT OR IGNORE INTO merchants (name, slug, website_url) VALUES (?, ?, ?)',
                    [merchant.name, merchant.slug, merchant.website_url],
                    err => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        completed++;
                        if (completed === merchants.length) {
                            resolve();
                        }
                    }
                );
            });
        });
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initializeDatabase();
            this.initialized = true;
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

    async saveCoupon(couponData) {
        // Validate required fields
        if (!couponData.title || !couponData.merchant_id) {
            this.logger.error('Missing required fields: title, merchant_id');
            return false;
        }

        return new Promise(resolve => {
            this.db.run(
                `
        INSERT OR REPLACE INTO coupons (
          title, description, discount_type, discount_value, coupon_code,
          merchant_id, source_url, image_url, status, is_featured,
          valid_until, scraped_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
                [
                    couponData.title,
                    couponData.description,
                    couponData.discount_type,
                    couponData.discount_value,
                    couponData.coupon_code,
                    couponData.merchant_id,
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
