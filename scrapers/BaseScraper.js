const Logger = require('../utils/Logger');

class BaseScraper {
    constructor(config, db, browser) {
        this.config = config;
        this.db = db;
        this.browser = browser;
        this.logger = new Logger(`${config.name}Scraper`);
        this.merchantId = null;
    }

    async initialize() {
        if (!this.merchantId) {
            this.merchantId = await this.db.getMerchantId(this.config.slug);
            if (!this.merchantId) {
                throw new Error(`Merchant not found: ${this.config.slug}`);
            }
        }
    }

    async scrape() {
        await this.initialize();

        const results = {
            platform: this.config.name,
            found: 0,
            saved: 0,
            errors: 0,
            items: [],
        };

        for (const [pageType, url] of Object.entries(this.config.urls)) {
            try {
                this.logger.info(`🔍 Scraping ${pageType}: ${url}`);
                const pageResults = await this.scrapePage(url, pageType);

                results.found += pageResults.length;
                results.items.push(...pageResults);

                this.logger.info(`✅ Found ${pageResults.length} items from ${pageType}`);

                // Add delay between pages
                await this.delay(this.config.delays?.betweenPages || 3000);
            } catch (error) {
                this.logger.error(`❌ Error scraping ${pageType}:`, error);
                results.errors++;
            }
        }

        // Process and save items
        if (results.items.length > 0) {
            const processed = this.processItems(results.items);
            const saveResult = await this.db.saveBatch(processed);
            results.saved = saveResult.saved;
            results.errors += saveResult.errors;
        }

        return results;
    }

    async scrapePage(url, pageType) {
        const page = await this.browser.createPage();

        try {
            // Navigate to page
            await this.browser.navigateWithRetry(page, url, {
                timeout: this.config.limits.timeout,
                waitFor: this.config.delays?.pageLoad || 3000,
            });

            // Handle anti-bot protection
            await this.browser.handleAntiBot(page);

            // Scroll to load more content
            await this.browser.scrollPage(page, { maxScrolls: 2 });

            // Extract data using page-specific selectors
            const selectors = this.config.selectors[pageType];
            if (!selectors) {
                throw new Error(`No selectors defined for page type: ${pageType}`);
            }

            const items = await this.extractItems(page, selectors);

            return items.slice(0, this.config.limits.maxItems);
        } finally {
            await page.close();
        }
    }

    async extractItems(page, selectors) {
        return await page.evaluate(sel => {
            const items = [];
            const containers = document.querySelectorAll(sel.container);

            containers.forEach((container, _index) => {
                try {
                    const item = {};

                    // Extract title
                    const titleEl = container.querySelector(sel.title);
                    item.title = titleEl?.textContent?.trim();

                    // Extract description
                    if (sel.description) {
                        const descEl = container.querySelector(sel.description);
                        item.description = descEl?.textContent?.trim();
                    }

                    // Extract price
                    if (sel.price) {
                        const priceEl = container.querySelector(sel.price);
                        item.price = priceEl?.textContent?.trim();
                    }

                    // Extract original price
                    if (sel.originalPrice) {
                        const originalPriceEl = container.querySelector(sel.originalPrice);
                        item.originalPrice = originalPriceEl?.textContent?.trim();
                    }

                    // Extract discount
                    if (sel.discount) {
                        const discountEl = container.querySelector(sel.discount);
                        item.discount = discountEl?.textContent?.trim();
                    }

                    // Extract coupon code
                    if (sel.code) {
                        const codeEl = container.querySelector(sel.code);
                        item.code = codeEl?.textContent?.trim();
                    }

                    // Extract image
                    if (sel.image) {
                        const imgEl = container.querySelector(sel.image);
                        item.image = imgEl?.src || imgEl?.getAttribute('data-src');
                    }

                    // Extract link
                    if (sel.link) {
                        const linkEl = container.querySelector(sel.link);
                        item.link = linkEl?.href;
                    }

                    // Only add if we have at least a title
                    if (item.title) {
                        items.push(item);
                    }
                } catch (error) {
                    console.error('Error extracting item:', error);
                }
            });

            return items;
        }, selectors);
    }

    processItems(items) {
        return items.map(item => this.processItem(item)).filter(Boolean);
    }

    processItem(item) {
        try {
            // Parse discount
            const { discountValue, discountType } = this.parseDiscount(item.discount);

            // Generate description if not provided
            const description = item.description || `${item.title} - Promo menarik dari ${this.config.name}`;

            // Calculate valid until date (7 days from now)
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 7);

            return {
                title: item.title,
                description: description.substring(0, 500), // Limit description length
                discount_type: discountType,
                discount_value: discountValue,
                coupon_code: item.code || null,
                merchant_id: this.merchantId,
                source_url: item.link || this.config.urls[Object.keys(this.config.urls)[0]],
                image_url: item.image || null,
                status: 'active',
                is_featured: Math.random() > 0.85, // 15% chance to be featured
                valid_until: validUntil.toISOString(),
                scraped_at: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error('Error processing item:', error);
            return null;
        }
    }

    parseDiscount(discountText) {
        if (!discountText) {
            return { discountValue: null, discountType: 'percentage' };
        }

        // Try to extract percentage discount
        const percentMatch = discountText.match(/(\d+)%/);
        if (percentMatch) {
            return {
                discountValue: parseInt(percentMatch[1]),
                discountType: 'percentage',
            };
        }

        // Try to extract fixed amount discount (Rupiah)
        const rupiahMatch = discountText.match(/Rp\s*([\d.,]+)/);
        if (rupiahMatch) {
            const amount = parseInt(rupiahMatch[1].replace(/[.,]/g, ''));
            return {
                discountValue: amount,
                discountType: 'fixed',
            };
        }

        // Try to extract "up to" discounts
        const upToMatch = discountText.match(/up to (\d+)%|hingga (\d+)%/i);
        if (upToMatch) {
            const percentage = parseInt(upToMatch[1] || upToMatch[2]);
            return {
                discountValue: percentage,
                discountType: 'percentage',
            };
        }

        return { discountValue: null, discountType: 'percentage' };
    }

    async test() {
        try {
            await this.initialize();

            // Test with first URL
            const firstUrl = Object.values(this.config.urls)[0];
            const page = await this.browser.createPage();

            await page.goto(firstUrl, { timeout: 10000 });
            const title = await page.title();
            await page.close();

            return title.length > 0;
        } catch (error) {
            this.logger.error('Test failed:', error);
            return false;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BaseScraper;
