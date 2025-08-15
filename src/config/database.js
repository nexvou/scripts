/**
 * Database Configuration
 * Supports multiple database adapters for production scalability
 */

const config = {
    // Database adapter selection
    adapter: process.env.DB_ADAPTER || 'sqlite', // mysql, postgresql, sqlite, supabase

    // Connection configurations
    connections: {
        mysql: {
            host: process.env.MYSQL_HOST || 'localhost',
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'ecommerce_coupons',
            charset: 'utf8mb4',
            timezone: '+07:00', // Indonesia timezone
            pool: {
                min: 2,
                max: 10,
                acquireTimeoutMillis: 30000,
                createTimeoutMillis: 30000,
                destroyTimeoutMillis: 5000,
                idleTimeoutMillis: 30000,
                reapIntervalMillis: 1000,
                createRetryIntervalMillis: 200,
            },
        },

        postgresql: {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: process.env.POSTGRES_PORT || 5432,
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || '',
            database: process.env.POSTGRES_DATABASE || 'ecommerce_coupons',
            ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
            pool: {
                min: 2,
                max: 10,
            },
        },

        sqlite: {
            filename: process.env.SQLITE_PATH || './data/ecommerce_coupons.db',
            useNullAsDefault: true,
            pool: {
                min: 1,
                max: 1,
            },
        },

        supabase: {
            url: process.env.SUPABASE_URL,
            key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
            schema: 'public',
        },
    },

    // Migration settings
    migrations: {
        directory: './migrations',
        tableName: 'knex_migrations',
    },

    // Seed settings
    seeds: {
        directory: './seeds',
    },
};

module.exports = config;
