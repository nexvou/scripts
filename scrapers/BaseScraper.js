const Logger = require('../utils/Logger');
const MockScraper = require('../utils/MockScraper');
const HttpScraper = require('../utils/HttpScraper');
const CuratedScraper = require('../utils/CuratedScraper');

class BaseScraper {
    constructor(config, db, browser) {
        this.config = config;
        this.db = db;
        this.browser = browser;
        this.logger = new Logger(`${config.name}Scraper`);
        this.platformId = null;
        this.mockScraper = new MockScraper();
        this.httpScraper = new HttpScraper();
        this.curatedScraper = new CuratedScraper();
        this.useMockData = process.env.USE_MOCK_DATA === 'true';
        this.useCuratedData = process.env.USE_CURATED_DATA === 'true';
        this.autoFallback = process.env.USE_MOCK_DATA === 'auto';
        this.browserFailureCount = 0;
    }

    async initialize() {
        if (!this.platformId) {
            this.platformId = await this.db.getPlatformId(this.config.slug);
            if (!this.platformId) {
                throw new Error(`Platform not found: ${this.config.slug}`);
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

                let pageResults;
                if (this.useMockData) {
                    this.logger.info(`🎭 Using mock data for ${pageType}`);
                    pageResults = await this.mockScraper.generateMockData(this.config.name, 5);
                } else if (this.useCuratedData) {
                    this.logger.info(`📚 Using curated real data for ${pageType}`);
                    try {
                        pageResults = await this.curatedScraper.scrapePlatform(this.config.name);
                    } catch (curatedError) {
                        this.logger.warn(`❌ Curated data failed, using mock data: ${curatedError.message}`);
                        pageResults = await this.mockScraper.generateMockData(this.config.name, 5);
                    }
                } else {
                    // Smart fallback: HTTP -> Mock (skip slow browser for problematic sites)
                    const problematicSites = ['tokopedia', 'blibli', 'grab'];
                    const useMockDirectly =
                        problematicSites.includes(this.config.slug) &&
                        (pageType === 'promo' ||
                            pageType === 'deals' ||
                            pageType === 'flashSale' ||
                            pageType === 'food' ||
                            pageType === 'mart');

                    if (useMockDirectly) {
                        this.logger.info(`🎭 Using mock data for ${this.config.name} ${pageType} (known problematic)`);
                        pageResults = await this.mockScraper.generateMockData(this.config.name, 5);
                    } else {
                        try {
                            pageResults = await this.httpScraper.scrapeBasicData(url, this.config.name);
                            this.logger.info(`✅ HTTP scraping successful for ${pageType}`);
                        } catch (httpError) {
                            this.logger.warn(`❌ HTTP scraping failed, trying browser scraping: ${httpError.message}`);

                            try {
                                // Reduced timeout for faster fallback
                                const scrapePromise = this.scrapePage(url, pageType);
                                const timeoutPromise = new Promise((_, reject) => {
                                    setTimeout(
                                        () => reject(new Error('Browser scraping timeout after 15 seconds')),
                                        15000
                                    );
                                });

                                pageResults = await Promise.race([scrapePromise, timeoutPromise]);
                                this.browserFailureCount = 0; // Reset on success
                                this.logger.info(`✅ Browser scraping successful for ${pageType}`);
                            } catch (browserError) {
                                this.browserFailureCount++;
                                this.logger.warn(
                                    `❌ Browser scraping failed, using mock data: ${browserError.message}`
                                );

                                // Skip curated data, go directly to mock for speed
                                pageResults = await this.mockScraper.generateMockData(this.config.name, 5);
                            }
                        }
                    }
                }

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
            const processed = this.processItems(results.items, Object.values(this.config.urls)[0]);
            const saveResult = await this.db.saveBatch(processed);
            results.saved = saveResult.saved;
            results.errors += saveResult.errors;
        }

        return results;
    }

    async scrapePage(url, pageType) {
        this.logger.info(`📄 Creating page for ${pageType}`);
        let page;

        try {
            page = await this.browser.createPage();

            this.logger.info(`🔗 Navigating to ${url}`);
            // Navigate to page with shorter timeout
            await this.browser.navigateWithRetry(page, url, {
                timeout: Math.min(this.config.limits.timeout, 20000), // Max 20 seconds
                waitFor: Math.min(this.config.delays?.pageLoad || 3000, 5000), // Max 5 seconds
            });

            this.logger.info(`🛡️ Handling anti-bot protection`);
            // Handle anti-bot protection
            await this.browser.handleAntiBot(page);

            this.logger.info(`📜 Scrolling page to load content`);
            // Scroll to load more content
            await this.browser.scrollPage(page, { maxScrolls: 2 });

            // Extract data using page-specific selectors
            const selectors = this.config.selectors[pageType];
            if (!selectors) {
                throw new Error(`No selectors defined for page type: ${pageType}`);
            }

            this.logger.info(`🔍 Extracting items using selectors`);
            const items = await this.extractItems(page, selectors);

            this.logger.info(`📊 Found ${items.length} items, limiting to ${this.config.limits.maxItems}`);
            return items.slice(0, this.config.limits.maxItems);
        } catch (error) {
            this.logger.error(`❌ Error in scrapePage: ${error.message}`);
            throw error;
        } finally {
            if (page) {
                try {
                    this.logger.info(`🔒 Closing page`);
                    await page.close();
                } catch (closeError) {
                    this.logger.warn(`⚠️ Error closing page: ${closeError.message}`);
                }
            }
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

    processItems(items, defaultUrl = null) {
        return items.map(item => this.processItem(item, defaultUrl)).filter(Boolean);
    }

    processItem(item, defaultUrl = null) {
        try {
            // Debug logging
            this.logger.debug('Processing item:', JSON.stringify(item, null, 2));

            // Handle curated data format vs scraped data format
            let discountValue, discountType;

            if (item.discount_type && item.discount_value !== undefined) {
                // Curated data format
                discountType = item.discount_type;
                discountValue = item.discount_value;
            } else {
                // Scraped data format
                const parsed = this.parseDiscount(item.discount);
                discountValue = parsed.discountValue;
                discountType = parsed.discountType;
            }

            // Generate description if not provided
            const description = item.description || `${item.title} - Promo menarik dari ${this.config.name}`;

            // Use provided valid_until or calculate (7 days from now)
            let validUntil;
            if (item.valid_until) {
                validUntil = item.valid_until;
            } else {
                const date = new Date();
                date.setDate(date.getDate() + 7);
                validUntil = date.toISOString();
            }

            const processedItem = {
                title: item.title,
                description: description.substring(0, 500), // Limit description length
                discount_type: discountType,
                discount_value: discountValue,
                coupon_code: item.coupon_code || item.code || null,
                platform_id: this.platformId,
                source_url:
                    item.source_url || item.link || defaultUrl || this.config.urls[Object.keys(this.config.urls)[0]],
                image_url: item.image_url || item.image || null,
                status: item.status || 'active',
                is_featured: item.is_featured !== undefined ? item.is_featured : Math.random() > 0.85,
                valid_until: validUntil,
                scraped_at: item.scraped_at || new Date().toISOString(),
            };

            this.logger.debug('Processed item:', JSON.stringify(processedItem, null, 2));
            return processedItem;
        } catch (error) {
            this.logger.error('Error processing item:', error);
            return null;
        }
    }

    parseDiscount(discountText) {
        if (!discountText) {
            return { discountValue: 10, discountType: 'percentage' }; // Default 10%
        }

        // Clean the text
        const cleanText = discountText.toString().trim();

        // Try to extract percentage discount
        const percentMatch = cleanText.match(/(\d+)%/);
        if (percentMatch) {
            return {
                discountValue: parseInt(percentMatch[1]),
                discountType: 'percentage',
            };
        }

        // Try to extract fixed amount discount (Rupiah)
        const rupiahMatch = cleanText.match(/Rp\s*([\d.,]+)/);
        if (rupiahMatch) {
            const amount = parseInt(rupiahMatch[1].replace(/[.,]/g, ''));
            return {
                discountValue: amount,
                discountType: 'fixed',
            };
        }

        // Try to extract "up to" discounts
        const upToMatch = cleanText.match(/up to (\d+)%|hingga (\d+)%/i);
        if (upToMatch) {
            const percentage = parseInt(upToMatch[1] || upToMatch[2]);
            return {
                discountValue: percentage,
                discountType: 'percentage',
            };
        }

        // If no pattern matches, try to extract any number
        const numberMatch = cleanText.match(/(\d+)/);
        if (numberMatch) {
            return {
                discountValue: parseInt(numberMatch[1]),
                discountType: 'percentage',
            };
        }

        return { discountValue: 15, discountType: 'percentage' }; // Default 15%
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
