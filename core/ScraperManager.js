const cron = require('node-cron');
const DatabaseManager = require('./DatabaseManager');
const BrowserManager = require('./BrowserManager');
const Logger = require('../utils/Logger');
const RateLimiter = require('../utils/RateLimiter');
const scraperFactories = require('../scrapers');

class ScraperManager {
    constructor(config) {
        this.config = config;
        this.logger = new Logger('ScraperManager');
        this.db = new DatabaseManager();
        this.browser = new BrowserManager();
        this.rateLimiter = new RateLimiter();
        this.scrapers = new Map();
        this.jobs = new Map();
        this.isRunning = false;

        this.initializeScrapers();
    }

    initializeScrapers() {
        for (const [platform, config] of Object.entries(this.config.platforms)) {
            if (config.enabled && scraperFactories[platform]) {
                const ScraperClass = scraperFactories[platform];
                this.scrapers.set(platform, new ScraperClass(config, this.db, this.browser));
                this.logger.info(`✅ Initialized ${platform} scraper`);
            }
        }
    }

    async runTests() {
        this.logger.info('🧪 Running system tests...');

        // Test database connection
        const dbTest = await this.db.testConnection();
        this.logger.info(`Database: ${dbTest ? '✅' : '❌'}`);

        // Test browser
        const browserTest = await this.browser.test();
        this.logger.info(`Browser: ${browserTest ? '✅' : '❌'}`);

        // Test each scraper
        for (const [platform, scraper] of this.scrapers) {
            try {
                const result = await scraper.test();
                this.logger.info(`${platform}: ${result ? '✅' : '❌'}`);
            } catch (error) {
                this.logger.error(`${platform}: ❌ ${error.message}`);
            }
        }
    }

    async scrapePlatform(platform) {
        const scraper = this.scrapers.get(platform);
        if (!scraper) {
            throw new Error(`Scraper not found for platform: ${platform}`);
        }

        await this.rateLimiter.wait(platform);

        try {
            this.logger.info(`🎯 Starting scrape for ${platform}`);
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Scrape timeout after 5 minutes')), 300000);
            });
            
            const result = await Promise.race([
                scraper.scrape(),
                timeoutPromise
            ]);
            
            this.logger.info(`✅ ${platform}: ${result.saved}/${result.found} items saved`);
            return result;
        } catch (error) {
            this.logger.error(`❌ ${platform} scrape failed:`, error);
            throw error;
        }
    }

    async scrapeAll() {
        const results = new Map();

        for (const platform of this.scrapers.keys()) {
            try {
                const result = await this.scrapePlatform(platform);
                results.set(platform, result);

                // Add delay between platforms
                await this.delay(this.config.delays.betweenPlatforms);
            } catch (error) {
                results.set(platform, { error: error.message });
            }
        }

        // Cleanup expired coupons
        await this.db.cleanupExpired();

        // Update statistics
        await this.db.updateStats();

        this.logSummary(results);
        return results;
    }

    async startScheduler() {
        if (this.isRunning) {
            this.logger.warn('Scheduler already running');
            return;
        }

        this.isRunning = true;
        this.logger.info('⏰ Starting scheduled jobs...');

        // Main scraping job
        const mainJob = cron.schedule(
            this.config.schedule.main,
            async () => {
                this.logger.info('🔄 Running scheduled scrape...');
                await this.scrapeAll();
            },
            { scheduled: false }
        );

        // Cleanup job
        const cleanupJob = cron.schedule(
            this.config.schedule.cleanup,
            async () => {
                this.logger.info('🧹 Running cleanup job...');
                await this.db.cleanupExpired();
            },
            { scheduled: false }
        );

        // Stats update job
        const statsJob = cron.schedule(
            this.config.schedule.stats,
            async () => {
                this.logger.info('📊 Updating statistics...');
                await this.db.updateStats();
            },
            { scheduled: false }
        );

        this.jobs.set('main', mainJob);
        this.jobs.set('cleanup', cleanupJob);
        this.jobs.set('stats', statsJob);

        // Start all jobs
        for (const job of this.jobs.values()) {
            job.start();
        }

        this.logger.info('✅ All scheduled jobs started');
    }

    stop() {
        this.isRunning = false;

        // Stop all cron jobs
        for (const job of this.jobs.values()) {
            job.stop();
        }

        // Close browser
        this.browser.close();

        this.logger.info('🛑 Scraper manager stopped');
    }

    logSummary(results) {
        this.logger.info('\n📊 Scraping Summary:');
        let totalFound = 0;
        let totalSaved = 0;

        for (const [platform, result] of results) {
            if (result.error) {
                this.logger.error(`  ${platform}: ❌ ${result.error}`);
            } else {
                this.logger.info(`  ${platform}: ✅ ${result.saved}/${result.found} saved`);
                totalFound += result.found;
                totalSaved += result.saved;
            }
        }

        this.logger.info(`\n🎯 Total: ${totalSaved}/${totalFound} items saved`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            scrapers: Array.from(this.scrapers.keys()),
            jobs: Array.from(this.jobs.keys()),
            timestamp: new Date().toISOString(),
        };
    }
}

module.exports = ScraperManager;
