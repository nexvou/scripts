#!/usr/bin/env node

/**
 * Nexvou Scripts Advanced Scraper System
 * Powerful, clean, and structured scraper
 */

require('dotenv').config();

const ScraperManager = require('./core/ScraperManager');
const Logger = require('./utils/Logger');
const config = require('./config/scraper.config');

class KuponScraper {
    constructor() {
        this.manager = new ScraperManager(config);
        this.logger = new Logger('KuponScraper');
    }

    async start() {
        this.logger.info('🚀 Starting Kupon.id Scraper System');

        try {
            // Parse command line arguments
            const args = this.parseArgs();

            if (args.help) {
                this.showHelp();
                return;
            }

            if (args.test) {
                await this.runTests();
                return;
            }

            if (args.single) {
                await this.runSingleScrape(args.platform);
                return;
            }

            if (args.schedule) {
                await this.startScheduler();
                return;
            }

            // Default: run all scrapers once
            await this.runAllScrapers();
        } catch (error) {
            this.logger.error('Fatal error:', error);
            process.exit(1);
        }
    }

    parseArgs() {
        const args = process.argv.slice(2);
        return {
            help: args.includes('--help') || args.includes('-h'),
            test: args.includes('--test'),
            single: args.includes('--single'),
            schedule: args.includes('--schedule'),
            platform: args.find(arg => !arg.startsWith('--')),
        };
    }

    showHelp() {
        console.log(`
🎯 Nexvou Scripts Scraper System

Usage:
  node index.js [options] [platform]

Options:
  --help, -h     Show this help message
  --test         Run connection and scraper tests
  --single       Run scraper for single platform
  --schedule     Start scheduled scraping service

Platforms:
  shopee         Scrape Shopee deals
  tokopedia      Scrape Tokopedia promos
  lazada         Scrape Lazada flash sales
  blibli         Scrape Blibli deals
  traveloka      Scrape Traveloka deals
  grab           Scrape Grab promos
  all            Scrape all platforms (default)

Examples:
  node index.js --test
  node index.js --single shopee
  node index.js --schedule
  node index.js
    `);
    }

    async runTests() {
        this.logger.info('🧪 Running scraper tests...');
        await this.manager.runTests();
    }

    async runSingleScrape(platform) {
        if (!platform) {
            this.logger.error('Platform required for single scrape. Use --help for usage.');
            return;
        }

        this.logger.info(`🎯 Running single scrape for: ${platform}`);
        await this.manager.scrapePlatform(platform);
    }

    async runAllScrapers() {
        this.logger.info('🔄 Running all scrapers...');
        await this.manager.scrapeAll();
    }

    async startScheduler() {
        this.logger.info('⏰ Starting scheduled scraping service...');
        await this.manager.startScheduler();

        // Keep process alive
        process.on('SIGINT', () => {
            this.logger.info('🛑 Gracefully shutting down...');
            this.manager.stop();
            process.exit(0);
        });
    }
}

// Run if called directly
if (require.main === module) {
    const scraper = new KuponScraper();
    scraper.start().catch(console.error);
}

module.exports = KuponScraper;
