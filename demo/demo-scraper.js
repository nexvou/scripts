#!/usr/bin/env node

/**
 * Demo Scraper - Shows how the scraper system works with mock data
 */

const Logger = require('../utils/Logger');

class DemoScraper {
    constructor() {
        this.logger = new Logger('DemoScraper');
    }

    async run() {
        this.logger.info('🎬 Starting Nexvou Scripts Scraper Demo');
        this.logger.info('=====================================\n');

        // Simulate scraping different platforms
        const platforms = ['shopee', 'tokopedia', 'lazada', 'blibli', 'traveloka', 'grab'];
        const results = new Map();

        for (const platform of platforms) {
            this.logger.info(`🎯 Scraping ${platform}...`);

            // Simulate scraping delay
            await this.delay(1000 + Math.random() * 2000);

            // Generate mock results
            const found = Math.floor(Math.random() * 30) + 10;
            const saved = Math.floor(found * (0.7 + Math.random() * 0.3));

            results.set(platform, { found, saved, errors: found - saved });

            this.logger.info(`✅ ${platform}: ${saved}/${found} items saved`);

            // Show sample items
            this.showSampleItems(platform);

            await this.delay(500);
        }

        this.showSummary(results);
    }

    showSampleItems(platform) {
        const sampleItems = this.generateSampleItems(platform);

        this.logger.info(`📦 Sample items from ${platform}:`);
        sampleItems.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.title}`);
            console.log(`      Discount: ${item.discount}`);
            console.log(`      Valid until: ${item.validUntil}\n`);
        });
    }

    generateSampleItems(platform) {
        const samples = {
            shopee: [
                {
                    title: 'Flash Sale Smartphone Samsung Galaxy A54',
                    discount: '25% OFF',
                    validUntil: '2024-02-15',
                },
                {
                    title: 'Gratis Ongkir Tanpa Minimum Pembelian',
                    discount: 'Free Shipping',
                    validUntil: '2024-02-10',
                },
            ],
            tokopedia: [
                {
                    title: 'Cashback 50% Maksimal Rp50.000',
                    discount: 'Cashback Rp50.000',
                    validUntil: '2024-02-20',
                },
                {
                    title: 'Diskon Elektronik Hingga 70%',
                    discount: '70% OFF',
                    validUntil: '2024-02-18',
                },
            ],
            lazada: [
                {
                    title: 'Voucher Belanja Rp100.000',
                    discount: 'Rp100.000 OFF',
                    validUntil: '2024-02-12',
                },
                {
                    title: 'Flash Sale Fashion Wanita',
                    discount: '40% OFF',
                    validUntil: '2024-02-14',
                },
            ],
            blibli: [
                {
                    title: 'Promo Gadget Terbaru',
                    discount: '30% OFF',
                    validUntil: '2024-02-16',
                },
            ],
            traveloka: [
                {
                    title: 'Diskon Hotel Hingga 60%',
                    discount: '60% OFF',
                    validUntil: '2024-03-01',
                },
            ],
            grab: [
                {
                    title: 'GrabFood Diskon 40%',
                    discount: '40% OFF',
                    validUntil: '2024-02-09',
                },
            ],
        };

        return samples[platform] || [];
    }

    showSummary(results) {
        this.logger.info('\n📊 Demo Scraping Summary:');
        this.logger.info('==========================');

        let totalFound = 0;
        let totalSaved = 0;

        for (const [platform, result] of results) {
            this.logger.info(`  ${platform}: ✅ ${result.saved}/${result.found} saved`);
            totalFound += result.found;
            totalSaved += result.saved;
        }

        this.logger.info(`\n🎯 Total: ${totalSaved}/${totalFound} items saved`);
        this.logger.info(`📈 Success rate: ${Math.round((totalSaved / totalFound) * 100)}%`);

        this.logger.info('\n💡 This was a demo with mock data.');
        this.logger.info('   To run with real data, use: npm run scrape');
        this.logger.info('   To test connections, use: npm test');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run demo
if (require.main === module) {
    const demo = new DemoScraper();
    demo.run().catch(console.error);
}

module.exports = DemoScraper;
