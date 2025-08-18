/**
 * Database Adapter Interface
 * Provides unified interface for multiple database types
 */

import knex from 'knex';
import { createClient } from '@supabase/supabase-js';
import Logger from '../utils/Logger.js';
import dbConfig from '../config/database.js';
import DatabaseInitializer from './DatabaseInitializer.js';

class DatabaseAdapter {
    constructor() {
        this.logger = new Logger('DatabaseAdapter');
        this.adapter = dbConfig.adapter;
        this.connection = null;
        this.supabase = null;
        this.initializer = new DatabaseInitializer();
    }

    async connect() {
        try {
            // Initialize database setup before connecting
            await this.initializeDatabase();

            this.logger.info(`🔌 Connecting to ${this.adapter} database...`);

            switch (this.adapter) {
                case 'mysql':
                    this.connection = knex({
                        client: 'mysql2',
                        connection: dbConfig.connections.mysql,
                        migrations: dbConfig.migrations,
                        seeds: dbConfig.seeds,
                    });
                    break;

                case 'postgresql':
                    this.connection = knex({
                        client: 'pg',
                        connection: dbConfig.connections.postgresql,
                        migrations: dbConfig.migrations,
                        seeds: dbConfig.seeds,
                    });
                    break;

                case 'sqlite':
                    this.connection = knex({
                        client: 'sqlite3',
                        connection: dbConfig.connections.sqlite,
                        migrations: dbConfig.migrations,
                        seeds: dbConfig.seeds,
                        useNullAsDefault: true,
                    });
                    break;

                case 'supabase': {
                    const supabaseConfig = dbConfig.connections.supabase;
                    this.supabase = createClient(supabaseConfig.url, supabaseConfig.key);
                    break;
                }

                default:
                    throw new Error(`Unsupported database adapter: ${this.adapter}`);
            }

            // Test connection
            await this.testConnection();
            this.logger.info(`✅ Connected to ${this.adapter} database successfully`);
        } catch (error) {
            this.logger.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    async testConnection() {
        if (this.adapter === 'supabase') {
            const { error } = await this.supabase.from('platforms').select('count').limit(1);
            if (error && error.code !== 'PGRST116') {
                // Ignore table not found for initial setup
                throw error;
            }
        } else {
            await this.connection.raw('SELECT 1');
        }
    }

    async runMigrations() {
        if (this.adapter === 'supabase') {
            this.logger.info('📊 Supabase migrations handled via dashboard');
            return;
        }

        try {
            this.logger.info('📊 Running database migrations...');
            await this.connection.migrate.latest();
            this.logger.info('✅ Migrations completed successfully');
        } catch (error) {
            this.logger.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async runSeeds() {
        if (this.adapter === 'supabase') {
            this.logger.info('🌱 Supabase seeding handled via dashboard');
            return;
        }

        try {
            this.logger.info('🌱 Running database seeds...');
            await this.connection.seed.run();
            this.logger.info('✅ Seeds completed successfully');
        } catch (error) {
            this.logger.error('❌ Seeding failed:', error);
            throw error;
        }
    }

    // Platform operations
    async getPlatforms() {
        if (this.adapter === 'supabase') {
            const { data, error } = await this.supabase.from('platforms').select('*').eq('is_active', true);
            if (error) throw error;
            return data;
        }
        return await this.connection('platforms').where('is_active', true);
    }

    async getPlatformBySlug(slug) {
        if (this.adapter === 'supabase') {
            const { data, error } = await this.supabase.from('platforms').select('*').eq('slug', slug).single();
            if (error) throw error;
            return data;
        }
        return await this.connection('platforms').where('slug', slug).first();
    }

    // Merchant operations
    async getMerchants() {
        if (this.adapter === 'supabase') {
            const { data, error } = await this.supabase.from('merchants').select('*').eq('is_active', true);
            if (error) throw error;
            return data;
        }
        return await this.connection('merchants').where('is_active', true);
    }

    async getMerchantById(id) {
        if (this.adapter === 'supabase') {
            const { data, error } = await this.supabase.from('merchants').select('*').eq('id', id).single();
            if (error) throw error;
            return data;
        }
        return await this.connection('merchants').where('id', id).first();
    }

    // Coupon operations
    async getCoupons(filters = {}) {
        const query = this.buildCouponQuery(filters);

        if (this.adapter === 'supabase') {
            let supabaseQuery = this.supabase.from('coupons').select(`
          *,
          platforms:platform_id(name, slug),
          merchants:merchant_id(name, slug)
        `);

            if (filters.platform_id) supabaseQuery = supabaseQuery.eq('platform_id', filters.platform_id);
            if (filters.merchant_id) supabaseQuery = supabaseQuery.eq('merchant_id', filters.merchant_id);
            if (filters.status) supabaseQuery = supabaseQuery.eq('status', filters.status);
            if (filters.limit) supabaseQuery = supabaseQuery.limit(filters.limit);

            const { data, error } = await supabaseQuery;
            if (error) throw error;
            return data;
        }

        return await query;
    }

    buildCouponQuery(filters) {
        let query = this.connection('coupons')
            .leftJoin('platforms', 'coupons.platform_id', 'platforms.id')
            .leftJoin('merchants', 'coupons.merchant_id', 'merchants.id')
            .select(
                'coupons.*',
                'platforms.name as platform_name',
                'platforms.slug as platform_slug',
                'merchants.name as merchant_name',
                'merchants.slug as merchant_slug'
            );

        if (filters.platform_id) query = query.where('coupons.platform_id', filters.platform_id);
        if (filters.merchant_id) query = query.where('coupons.merchant_id', filters.merchant_id);
        if (filters.status) query = query.where('coupons.status', filters.status);
        if (filters.limit) query = query.limit(filters.limit);

        return query.orderBy('coupons.created_at', 'desc');
    }

    async saveCoupon(couponData) {
        if (this.adapter === 'supabase') {
            const { data, error } = await this.supabase
                .from('coupons')
                .upsert([couponData], {
                    onConflict: 'title,platform_id,merchant_id',
                    ignoreDuplicates: false,
                })
                .select();

            if (error) throw error;
            return data[0];
        }

        return await this.connection('coupons')
            .insert(couponData)
            .onConflict(['title', 'platform_id', 'merchant_id'])
            .merge();
    }

    async saveCouponBatch(coupons) {
        if (!coupons.length) return { saved: 0, errors: 0 };

        let saved = 0;
        let errors = 0;

        if (this.adapter === 'supabase') {
            try {
                const { error } = await this.supabase.from('coupons').upsert(coupons, {
                    onConflict: 'title,platform_id,merchant_id',
                    ignoreDuplicates: false,
                });

                if (error) throw error;
                saved = coupons.length;
            } catch (error) {
                this.logger.error('Batch save error:', error);
                errors = coupons.length;
            }
        } else {
            const batchSize = 100;
            for (let i = 0; i < coupons.length; i += batchSize) {
                const batch = coupons.slice(i, i + batchSize);
                try {
                    await this.connection('coupons')
                        .insert(batch)
                        .onConflict(['title', 'platform_id', 'merchant_id'])
                        .merge();
                    saved += batch.length;
                } catch (error) {
                    this.logger.error('Batch save error:', error);
                    errors += batch.length;
                }
            }
        }

        return { saved, errors };
    }

    // Scrape session operations
    async createScrapeSession(sessionData) {
        if (this.adapter === 'supabase') {
            const { data, error } = await this.supabase.from('scrape_sessions').insert([sessionData]).select().single();

            if (error) throw error;
            return data;
        }

        const [id] = await this.connection('scrape_sessions').insert(sessionData);
        return await this.connection('scrape_sessions').where('id', id).first();
    }

    async updateScrapeSession(sessionId, updateData) {
        if (this.adapter === 'supabase') {
            const { data, error } = await this.supabase
                .from('scrape_sessions')
                .update(updateData)
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            return data;
        }

        await this.connection('scrape_sessions').where('id', sessionId).update(updateData);
        return await this.connection('scrape_sessions').where('id', sessionId).first();
    }

    // Cleanup operations
    async cleanupExpiredCoupons() {
        const now = new Date().toISOString();

        if (this.adapter === 'supabase') {
            const { error } = await this.supabase
                .from('coupons')
                .update({ status: 'expired', updated_at: now })
                .lt('valid_until', now)
                .eq('status', 'active');

            if (error) throw error;
            return 0; // Supabase doesn't return affected count easily
        }

        const result = await this.connection('coupons')
            .where('valid_until', '<', now)
            .where('status', 'active')
            .update({
                status: 'expired',
                updated_at: now,
            });

        return result;
    }

    async getMetrics() {
        if (this.adapter === 'supabase') {
            const { data: totalCoupons } = await this.supabase.from('coupons').select('count').eq('status', 'active');

            const { data: totalPlatforms } = await this.supabase
                .from('platforms')
                .select('count')
                .eq('is_active', true);

            return {
                totalActiveCoupons: totalCoupons?.[0]?.count || 0,
                totalActivePlatforms: totalPlatforms?.[0]?.count || 0,
            };
        }

        const [totalCoupons, totalPlatforms] = await Promise.all([
            this.connection('coupons').where('status', 'active').count('* as count').first(),
            this.connection('platforms').where('is_active', true).count('* as count').first(),
        ]);

        return {
            totalActiveCoupons: totalCoupons.count,
            totalActivePlatforms: totalPlatforms.count,
        };
    }

    /**
     * Initialize database setup before connection
     */
    async initializeDatabase() {
        const config = dbConfig.connections[this.adapter];
        await this.initializer.initializeForAdapter(this.adapter, config);
    }

    async close() {
        if (this.connection) {
            await this.connection.destroy();
            this.logger.info('🔌 Database connection closed');
        }
    }
}

export default DatabaseAdapter;
