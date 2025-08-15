const { createClient } = require('@supabase/supabase-js');
const SQLiteManager = require('./SQLiteManager');
const Logger = require('../utils/Logger');

class DatabaseManager {
    constructor() {
        this.logger = new Logger('DatabaseManager');
        this.isProduction = process.env.NODE_ENV === 'production';

        if (this.isProduction) {
            // Use Supabase in production
            this.supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            this.merchantCache = new Map();
            this.logger.info('Using Supabase database (production)');
        } else {
            // Use SQLite in development/local - use singleton
            if (!DatabaseManager.sqliteInstance) {
                DatabaseManager.sqliteInstance = new SQLiteManager();
            }
            this.sqlite = DatabaseManager.sqliteInstance;
            this.logger.info('Using SQLite database (development)');
        }
    }

    async testConnection() {
        if (this.isProduction) {
            return this.testSupabaseConnection();
        } else {
            return this.sqlite.testConnection();
        }
    }

    async testSupabaseConnection() {
        try {
            const { error } = await this.supabase.from('merchants').select('count').limit(1);
            return !error;
        } catch (error) {
            this.logger.error('Supabase connection test failed:', error);
            return false;
        }
    }

    async getMerchantId(slug) {
        if (this.isProduction) {
            return this.getSupabaseMerchantId(slug);
        } else {
            return this.sqlite.getMerchantId(slug);
        }
    }

    async getSupabaseMerchantId(slug) {
        // Use cache to avoid repeated queries
        if (this.merchantCache.has(slug)) {
            return this.merchantCache.get(slug);
        }

        try {
            const { data, error } = await this.supabase.from('merchants').select('id').eq('slug', slug).single();

            if (error || !data) {
                this.logger.warn(`Merchant not found: ${slug}`);
                return null;
            }

            this.merchantCache.set(slug, data.id);
            return data.id;
        } catch (error) {
            this.logger.error(`Error getting merchant ID for ${slug}:`, error);
            return null;
        }
    }

    async saveCoupon(couponData) {
        if (this.isProduction) {
            return this.saveSupabaseCoupon(couponData);
        } else {
            return this.sqlite.saveCoupon(couponData);
        }
    }

    async saveSupabaseCoupon(couponData) {
        try {
            // Validate required fields
            if (!couponData.title || !couponData.merchant_id) {
                throw new Error('Missing required fields: title, merchant_id');
            }

            const { error } = await this.supabase.from('coupons').upsert(
                [
                    {
                        ...couponData,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ],
                {
                    onConflict: 'title,merchant_id',
                    ignoreDuplicates: false,
                }
            );

            if (error) {
                this.logger.error('Error saving coupon:', error);
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error('Error saving coupon:', error);
            return false;
        }
    }

    async saveBatch(coupons) {
        if (this.isProduction) {
            return this.saveSupabaseBatch(coupons);
        } else {
            return this.sqlite.saveBatch(coupons);
        }
    }

    async saveSupabaseBatch(coupons) {
        if (!coupons.length) return { saved: 0, errors: 0 };

        let saved = 0;
        let errors = 0;
        const batchSize = 10;

        // Process in batches to avoid overwhelming the database
        for (let i = 0; i < coupons.length; i += batchSize) {
            const batch = coupons.slice(i, i + batchSize);

            try {
                const { error } = await this.supabase.from('coupons').upsert(
                    batch.map(coupon => ({
                        ...coupon,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })),
                    {
                        onConflict: 'title,merchant_id',
                        ignoreDuplicates: false,
                    }
                );

                if (error) {
                    this.logger.error('Batch save error:', error);
                    errors += batch.length;
                } else {
                    saved += batch.length;
                }
            } catch (error) {
                this.logger.error('Batch save error:', error);
                errors += batch.length;
            }

            // Small delay between batches
            await this.delay(100);
        }

        return { saved, errors };
    }

    async cleanupExpired() {
        if (this.isProduction) {
            return this.cleanupSupabaseExpired();
        } else {
            return this.sqlite.cleanupExpired();
        }
    }

    async cleanupSupabaseExpired() {
        try {
            const { data, error } = await this.supabase
                .from('coupons')
                .update({
                    status: 'expired',
                    updated_at: new Date().toISOString(),
                })
                .lt('valid_until', new Date().toISOString())
                .eq('status', 'active');

            if (error) {
                this.logger.error('Error cleaning up expired coupons:', error);
                return 0;
            }

            const count = data?.length || 0;
            if (count > 0) {
                this.logger.info(`🧹 Marked ${count} coupons as expired`);
            }

            return count;
        } catch (error) {
            this.logger.error('Error cleaning up expired coupons:', error);
            return 0;
        }
    }

    async updateStats() {
        if (this.isProduction) {
            return this.updateSupabaseStats();
        } else {
            return this.sqlite.updateStats();
        }
    }

    async updateSupabaseStats() {
        try {
            // Update coupon view counts, click counts, etc.
            // This would typically call a stored procedure or function
            const { error } = await this.supabase.rpc('update_coupon_statistics');

            if (error && error.code !== 'PGRST202') {
                // Ignore if function doesn't exist
                this.logger.error('Error updating statistics:', error);
                return false;
            }

            this.logger.info('📊 Statistics updated');
            return true;
        } catch (error) {
            this.logger.error('Error updating statistics:', error);
            return false;
        }
    }

    async getCouponCount(merchantId = null) {
        if (this.isProduction) {
            return this.getSupabaseCouponCount(merchantId);
        } else {
            return this.sqlite.getCouponCount(merchantId);
        }
    }

    async getSupabaseCouponCount(merchantId = null) {
        try {
            let query = this.supabase.from('coupons').select('count').eq('status', 'active');

            if (merchantId) {
                query = query.eq('merchant_id', merchantId);
            }

            const { count, error } = await query;

            if (error) {
                this.logger.error('Error getting coupon count:', error);
                return 0;
            }

            return count || 0;
        } catch (error) {
            this.logger.error('Error getting coupon count:', error);
            return 0;
        }
    }

    async getRecentCoupons(limit = 10) {
        if (this.isProduction) {
            return this.getSupabaseRecentCoupons(limit);
        } else {
            return this.sqlite.getRecentCoupons(limit);
        }
    }

    async getSupabaseRecentCoupons(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('coupons')
                .select('title, merchant_id, created_at')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                this.logger.error('Error getting recent coupons:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            this.logger.error('Error getting recent coupons:', error);
            return [];
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    close() {
        if (!this.isProduction && this.sqlite) {
            this.sqlite.close();
        }
    }

    static clearSqliteInstance() {
        if (DatabaseManager.sqliteInstance) {
            DatabaseManager.sqliteInstance.close();
            DatabaseManager.sqliteInstance = null;
        }
    }
}

module.exports = DatabaseManager;
