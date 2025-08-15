const fs = require('fs');
const path = require('path');
const Logger = require('./Logger');

class CuratedScraper {
    constructor() {
        this.logger = new Logger('CuratedScraper');
        this.dataPath = path.join(process.cwd(), 'data', 'curated-deals.json');
    }

    async loadCuratedData() {
        try {
            if (!fs.existsSync(this.dataPath)) {
                throw new Error('Curated data file not found');
            }

            const rawData = fs.readFileSync(this.dataPath, 'utf8');
            return JSON.parse(rawData);
        } catch (error) {
            this.logger.error('❌ Failed to load curated data:', error.message);
            throw error;
        }
    }

    async scrapePlatform(platform) {
        try {
            this.logger.info(`📚 Loading curated data for ${platform}`);
            
            const allData = await this.loadCuratedData();
            const platformData = allData[platform.toLowerCase()] || [];
            
            if (platformData.length === 0) {
                this.logger.warn(`⚠️ No curated data found for ${platform}`);
                return [];
            }

            // Add some randomization to make it look more dynamic
            const shuffled = this.shuffleArray([...platformData]);
            const selected = shuffled.slice(0, Math.min(5, shuffled.length));

            // Add current timestamp and some variation
            const processedData = selected.map((item, index) => ({
                ...item,
                title: this.addVariation(item.title, index),
                scraped_at: new Date().toISOString(),
                // Ensure valid_until is in the future
                valid_until: item.valid_until || this.getFutureDate(7) // 7 days from now
            }));

            this.logger.info(`✅ Loaded ${processedData.length} curated deals for ${platform}`);
            return processedData;

        } catch (error) {
            this.logger.error(`❌ Failed to scrape curated data for ${platform}:`, error.message);
            throw error;
        }
    }

    addVariation(title, index) {
        const variations = [
            '', // No change
            ' - Terbatas!',
            ' - Hari Ini Saja!',
            ' - Limited Time!',
            ' - Buruan!'
        ];
        
        // Add variation occasionally
        if (Math.random() > 0.7) {
            const variation = variations[index % variations.length];
            return title + variation;
        }
        
        return title;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getFutureDate(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString();
    }

    async updateCuratedData(platform, newDeals) {
        try {
            const allData = await this.loadCuratedData();
            allData[platform.toLowerCase()] = newDeals;
            
            fs.writeFileSync(this.dataPath, JSON.stringify(allData, null, 2));
            this.logger.info(`✅ Updated curated data for ${platform}`);
            
        } catch (error) {
            this.logger.error(`❌ Failed to update curated data:`, error.message);
            throw error;
        }
    }

    async addDeal(platform, deal) {
        try {
            const allData = await this.loadCuratedData();
            
            if (!allData[platform.toLowerCase()]) {
                allData[platform.toLowerCase()] = [];
            }
            
            // Add timestamp and ensure required fields
            const processedDeal = {
                ...deal,
                scraped_at: new Date().toISOString(),
                valid_until: deal.valid_until || this.getFutureDate(30),
                status: deal.status || 'active'
            };
            
            allData[platform.toLowerCase()].push(processedDeal);
            
            fs.writeFileSync(this.dataPath, JSON.stringify(allData, null, 2));
            this.logger.info(`✅ Added new deal for ${platform}: ${deal.title}`);
            
        } catch (error) {
            this.logger.error(`❌ Failed to add deal:`, error.message);
            throw error;
        }
    }
}

module.exports = CuratedScraper;