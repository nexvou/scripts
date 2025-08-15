#!/usr/bin/env node

/**
 * CLI Tool for Manual Scraping
 * Usage: node src/cli/scrape.js [--platform shopee]
 */

const { Command } = require('commander');
const ScraperService = require('../services/ScraperService');
const Logger = require('../utils/Logger');

const program = new Command();
const logger = new Logger('CLI');

program.name('scrape').description('E-commerce coupon scraper CLI').version('1.0.0');

program
    .command('run')
    .description('Run scraping for all platforms')
    .option('-p, --platform <platform>', 'Scrape specific platform only')
    .option('-s, --schedule', 'Start scheduled scraping')
    .action(async options => {
        const service = new ScraperService();

        try {
            await service.initialize();

            if (options.schedule) {
                logger.info('🚀 Starting scheduled scraping...');
                await service.startScheduler();

                // Keep process alive
                process.on('SIGINT', async () => {
                    logger.info('🛑 Shutting down gracefully...');
                    await service.stop();
                    process.exit(0);
                });
            } else if (options.platform) {
                logger.info(`🎯 Running scraper for ${options.platform}...`);
                const result = await service.runManualScrape(options.platform);
                logger.info('✅ Scraping completed:', result);
                await service.stop();
            } else {
                logger.info('🔄 Running scraper for all platforms...');
                await service.runScrapingCycle();
                logger.info('✅ All scrapers completed');
                await service.stop();
            }
        } catch (error) {
            logger.error('❌ Scraping failed:', error);
            process.exit(1);
        }
    });

program
    .command('status')
    .description('Show scraper status')
    .action(async () => {
        const service = new ScraperService();

        try {
            await service.initialize();
            const status = await service.getStatus();

            console.log('\n📊 Scraper Status:');
            console.log(`Running: ${status.isRunning ? '✅' : '❌'}`);
            console.log(`Active Scrapers: ${status.activeScrapers}/${status.totalScrapers}`);
            console.log(`Total Coupons: ${status.metrics.totalActiveCoupons}`);
            console.log(`Last Update: ${status.lastUpdate}`);

            console.log('\n🤖 Platform Status:');
            for (const scraper of Object.values(status.scrapers)) {
                const statusIcon =
                    scraper.status === 'completed'
                        ? '✅'
                        : scraper.status === 'running'
                          ? '🔄'
                          : scraper.status === 'failed'
                            ? '❌'
                            : '⏸️';
                console.log(`  ${statusIcon} ${scraper.name}: ${scraper.status}`);
            }

            await service.stop();
        } catch (error) {
            logger.error('❌ Failed to get status:', error);
            process.exit(1);
        }
    });

program.parse();

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', error => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});
