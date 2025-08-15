/**
 * Vercel API: Trigger Manual Scrape
 * POST /api/scrape/trigger - Trigger manual scraping
 */

const ScraperService = require('../../src/services/ScraperService');

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authorization (optional)
    const authHeader = req.headers.authorization;
    const apiKey = process.env.SCRAPER_API_KEY;
    
    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const { platform } = req.body;
    
    const service = await getScraperService();
    
    // Trigger scraping
    const result = await service.runManualScrape(platform);
    
    res.status(200).json({
      success: true,
      message: 'Scraping triggered successfully',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scrape trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger scraping',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}