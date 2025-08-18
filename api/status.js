/**
 * Vercel API: System Status
 * GET /api/status - Get scraper system status and metrics
 */

const ScraperService = require('../src/services/ScraperService');

let scraperService = null;

async function getScraperService() {
    if (!scraperService) {
        scraperService = new ScraperService();
        await scraperService.initialize();
    }
    return scraperService;
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
        const service = await getScraperService();
        const status = await service.getStatus();

        res.status(200).json({
            success: true,
            data: {
                ...status,
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Status API error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get system status',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}
