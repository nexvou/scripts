/**
 * Scraper Service
 * Orchestrates scraping operations across all platforms
 */

const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/Logger');
const DatabaseAdapter = require('../database/DatabaseAdapter');
const BaseScraper = require('../scrapers/BaseScraper');
const scraperConfig = require('../config/scraper');

class ScraperService {
    constructor() {
        this.logger = new Logger('ScraperService');
        this.database = new DatabaseAdapter();
        this.scrapers = new Map();
        this.isRunning = false;
        this.cronJob = null;
        this.currentSession = null;
    }

    async initialize() {
        try {
            this.logger.info('🚀 Initializing Scraper Service...');

            // Connect to database
            await this.database.connect();

            // Run migrations
            await this.database.runMigrations();

            // Load platforms and initialize scrapers
            await this.loadPlatforms();

            this.logger.info('✅ Scraper Service initialized successfully');
        } catch (error) {
            this.logger.error('❌ Failed to initialize Scraper Service:', error);
            throw error;
        }
    }

    async loadPlatforms() {
        try {
            const platforms = await this.database.getPlatforms();

            for (const platform of platforms) {
                if (scraperConfig.platforms[platform.slug]?.enabled) {
                    // Merge database config with scraper config
                    const config = {
                        ...scraperConfig.platforms[platform.slug],
                        ...platform,
                    };

                    this.scrapers.set(platform.slug, {
                        platform: config,
                        lastRun: null,
                        status: 'idle',
                    });

                    this.logger.info(`✅ Loaded scraper for ${platform.name}`);
                }
            }

            this.logger.info(`📊 Loaded ${this.scrapers.size} active scrapers`);
        } catch (error) {
            this.logger.error('❌ Failed to load platforms:', error);
            throw error;
        }
    }

    async startScheduler() {
        if (this.isRunning) {
            this.logger.warn('⚠️ Scheduler already running');
            return;
        }

        try {
            this.logger.info('⏰ Starting scraper scheduler...');

            // Calculate cron expression for 1-minute intervals
            const intervalMinutes = Math.floor(scraperConfig.global.refreshInterval / 60000);
            const cronExpression = `*/${intervalMinutes} * * * *`;

            this.cronJob = cron.schedule(
                cronExpression,
                async () => {
                    await this.runScrapingCycle();
                },
                {
                    scheduled: false,
                    timezone: 'Asia/Jakarta',
                }
            );

            this.cronJob.start();
            this.isRunning = true;

            this.logger.info(`✅ Scheduler started with ${intervalMinutes}-minute intervals`);

            // Run initial scraping cycle
            await this.runScrapingCycle();
        } catch (error) {
            this.logger.error('❌ Failed to start scheduler:', error);
            throw error;
        }
    }

    async runScrapingCycle() {
        if (this.currentSession) {
            this.logger.warn('⚠️ Scraping cycle already in progress, skipping...');
            return;
        }

        const sessionId = uuidv4();
        this.currentSession = sessionId;

        try {
            this.logger.info(`🔄 Starting scraping cycle: ${sessionId}`);

            const results = new Map();
            const startTime = Date.now();

            // Run scrapers concurrently with limit
            const scraperEntries = Array.from(this.scrapers.entries());
            const concurrentLimit = scraperConfig.global.maxConcurrentScrapers;

            for (let i = 0; i < scraperEntries.length; i += concurrentLimit) {
                const batch = scraperEntries.slice(i, i + concurrentLimit);

                const batchPromises = batch.map(async ([slug, scraperInfo]) => {
                    try {
                        scraperInfo.status = 'running';
                        const result = await this.runSingleScraper(scraperInfo.platform);
                        scraperInfo.status = 'completed';
                        scraperInfo.lastRun = new Date();
                        results.set(slug, result);
                    } catch (error) {
                        scraperInfo.status = 'failed';
                        results.set(slug, { error: error.message });
                        this.logger.error(`❌ Scraper ${slug} failed:`, error);
                    }
                });

                await Promise.all(batchPromises);

                // Delay between batches
                if (i + concurrentLimit < scraperEntries.length) {
                    await this.delay(scraperConfig.global.delayBetweenRequests);
                }
            }

            // Cleanup expired coupons
            await this.database.cleanupExpiredCoupons();

            // Log summary
            const duration = Date.now() - startTime;
            this.logScrapingSummary(results, duration);
        } catch (error) {
            this.logger.error('❌ Scraping cycle failed:', error);
        } finally {
            this.currentSession = null;
        }
    }

    async runSingleScraper(platform) {
        const scraper = new BaseScraper(platform, this.database, scraperConfig);

        return await scraper.scrape();
    }

    async runManualScrape(platformSlug = null) {
        try {
            this.logger.info(`🎯 Running manual scrape${platformSlug ? ` for ${platformSlug}` : ''}`);

            if (platformSlug) {
                const scraperInfo = this.scrapers.get(platformSlug);
                if (!scraperInfo) {
                    throw new Error(`Platform ${platformSlug} not found`);
                }

                return await this.runSingleScraper(scraperInfo.platform);
            } else {
                // Run all scrapers
                await this.runScrapingCycle();
                return { message: 'Manual scrape completed for all platforms' };
            }
        } catch (error) {
            this.logger.error('❌ Manual scrape failed:', error);
            throw error;
        }
    }

    logScrapingSummary(results, duration) {
        this.logger.info('\n📊 Scraping Cycle Summary:');
        this.logger.info(`⏱️  Duration: ${duration}ms`);

        let totalFound = 0;
        let totalSaved = 0;
        let totalErrors = 0;

        for (const [platform, result] of results) {
            if (result.error) {
                this.logger.error(`  ${platform}: ❌ ${result.error}`);
                totalErrors++;
            } else {
                this.logger.info(`  ${platform}: ✅ ${result.saved}/${result.found} saved`);
                totalFound += result.found;
                totalSaved += result.saved;
            }
        }

        this.logger.info(`\n🎯 Total: ${totalSaved}/${totalFound} coupons saved, ${totalErrors} errors`);
    }

    async getStatus() {
        const metrics = await this.database.getMetrics();

        return {
            isRunning: this.isRunning,
            currentSession: this.currentSession,
            totalScrapers: this.scrapers.size,
            activeScrapers: Array.from(this.scrapers.values()).filter(s => s.status === 'running').length,
            lastUpdate: new Date().toISOString(),
            metrics,
            scrapers: Object.fromEntries(
                Array.from(this.scrapers.entries()).map(([slug, info]) => [
                    slug,
                    {
                        name: info.platform.name,
                        status: info.status,
                        lastRun: info.lastRun,
                        enabled: info.platform.enabled,
                    },
                ])
            ),
        };
    }

    async stop() {
        try {
            this.logger.info('🛑 Stopping Scraper Service...');

            if (this.cronJob) {
                this.cronJob.stop();
                this.cronJob = null;
            }

            this.isRunning = false;

            // Close database connection
            await this.database.close();

            this.logger.info('✅ Scraper Service stopped');
        } catch (error) {
            this.logger.error('❌ Error stopping Scraper Service:', error);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ScraperService;
