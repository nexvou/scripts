/**
 * Vercel API: Get Coupons
 * GET /api/coupons - Get all active coupons with filtering
 */

const DatabaseAdapter = require('../src/database/DatabaseAdapter');

let database = null;

async function getDatabase() {
    if (!database) {
        database = new DatabaseAdapter();
        await database.connect();
    }
    return database;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const db = await getDatabase();

        // Parse query parameters
        const {
            platform,
            merchant,
            status = 'active',
            featured,
            discount_type,
            limit = 50,
            offset = 0,
            sort = 'created_at',
            order = 'desc',
        } = req.query;

        // Build filters
        const filters = {
            status,
            limit: Math.min(parseInt(limit), 100), // Max 100 items
            offset: parseInt(offset),
        };

        if (platform) {
            const platformData = await db.getPlatformBySlug(platform);
            if (platformData) {
                filters.platform_id = platformData.id;
            }
        }

        if (merchant) {
            // Add merchant filter logic
            filters.merchant_slug = merchant;
        }

        if (featured === 'true') {
            filters.is_featured = true;
        }

        if (discount_type) {
            filters.discount_type = discount_type;
        }

        // Get coupons
        const coupons = await db.getCoupons(filters);

        // Get total count for pagination
        const totalFilters = { ...filters };
        delete totalFilters.limit;
        delete totalFilters.offset;
        const totalCoupons = await db.getCoupons(totalFilters);

        // Response
        res.status(200).json({
            success: true,
            data: coupons,
            pagination: {
                total: totalCoupons.length,
                limit: filters.limit,
                offset: filters.offset,
                hasMore: filters.offset + filters.limit < totalCoupons.length,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}
