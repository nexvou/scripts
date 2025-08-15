/**
 * Base Scraper Class
 * Production-ready base class for all platform scrapers
 */

const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/Logger');
const MetricsCollector = require('../utils/MetricsCollector');
const AntiDetection = require('../utils/AntiDetection');

class BaseScraper {
    constructor(platform, database, config) {
        this.platform = platform;
        this.database = database;
        this.config = config;
        this.logger = new Logger(`${platform.name}Scraper`);
        this.metrics = new MetricsCollector();
        this.antiDetection = new AntiDetection();

        this.browser = null;
        this.sessionId = uuidv4();
        this.sessionData = null;
        this.startTime = null;
    }

    async initialize() {
        try {
            this.logger.info(`🚀 Initializing ${this.platform.name} scraper`);

            // Create scrape session
            this.sessionData = await this.database.createScrapeSession({
                session_id: this.sessionId,
                platform_id: this.platform.id,
                status: 'running',
                started_at: new Date(),
                scraper_version: process.env.npm_package_version || '1.0.0',
            });

            this.startTime = Date.now();
            this.logger.info(`✅ Scraper initialized with session ID: ${this.sessionId}`);
        } catch (error) {
            this.logger.error('❌ Failed to initialize scraper:', error);
            throw error;
        }
    }

    async launchBrowser() {
        try {
            this.logger.info('🌐 Launching browser...');

            const browserConfig = {
                headless: this.config.browser.headless,
                timeout: this.config.browser.timeout,
                args: this.config.browser.args,
            };

            // Add executable path if available
            const executablePath = await this.findChromePath();
            if (executablePath) {
                browserConfig.executablePath = executablePath;
            }

            this.browser = await puppeteer.launch(browserConfig);
            this.logger.info('✅ Browser launched successfully');
        } catch (error) {
            this.logger.error('❌ Failed to launch browser:', error);
            throw error;
        }
    }

    async findChromePath() {
        const fs = require('fs');
        const os = require('os');

        const possiblePaths = [
            // System Chrome (more stable)
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',

            // Puppeteer Chrome
            `${os.homedir()}/.cache/puppeteer/chrome/*/chrome-*/Google Chrome for Testing`,
            `${os.homedir()}/.cache/puppeteer/chrome/*/chrome-*/chrome.exe`,
        ];

        for (const path of possiblePaths) {
            try {
                if (fs.existsSync(path)) {
                    return path;
                }
            } catch (e) {
                continue;
            }
        }

        return null; // Use default
    }

    async createPage() {
        try {
            const page = await this.browser.newPage();

            // Apply anti-detection measures
            await this.antiDetection.setupPage(page);

            // Set viewport
            await page.setViewport({
                width: 1366,
                height: 768,
                deviceScaleFactor: 1,
            });

            return page;
        } catch (error) {
            this.logger.error('❌ Failed to create page:', error);
            throw error;
        }
    }

    async scrapeEndpoint(endpoint, selectors) {
        const url = `${this.platform.base_url}${endpoint}`;
        let page = null;

        try {
            this.logger.info(`🔍 Scraping ${url}`);

            page = await this.createPage();

            // Navigate with retry logic
            await this.navigateWithRetry(page, url);

            // Wait for content to load
            await this.waitForContent(page, selectors);

            // Extract coupon data
            const coupons = await this.extractCoupons(page, selectors, url);

            this.logger.info(`✅ Found ${coupons.length} coupons from ${endpoint}`);
            return coupons;
        } catch (error) {
            this.logger.error(`❌ Failed to scrape ${endpoint}:`, error);
            return [];
        } finally {
            if (page) {
                await page.close().catch(() => {});
            }
        }
    }

    async navigateWithRetry(page, url, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: this.config.global.defaultTimeout,
                });

                // Check if page loaded successfully
                const title = await page.title();
                if (title && !title.includes('Error') && !title.includes('404')) {
                    return;
                }

                throw new Error('Page failed to load properly');
            } catch (error) {
                this.logger.warn(`Navigation attempt ${attempt} failed: ${error.message}`);

                if (attempt === maxRetries) {
                    throw error;
                }

                // Wait before retry
                await this.delay(2000 * attempt);
            }
        }
    }

    async waitForContent(page, selectors) {
        try {
            // Wait for any of the main selectors to appear
            await page.waitForSelector(selectors.couponContainer, {
                timeout: 10000,
                visible: true,
            });

            // Additional wait for dynamic content
            await this.delay(2000);

            // Scroll to load more content
            await this.scrollPage(page);
        } catch (error) {
            this.logger.warn('Content loading timeout, proceeding anyway');
        }
    }

    async scrollPage(page, scrolls = 3) {
        for (let i = 0; i < scrolls; i++) {
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });
            await this.delay(1000);
        }

        // Scroll back to top
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });
    }

    async extractCoupons(page, selectors, sourceUrl) {
        try {
            const coupons = await page.evaluate(
                (sel, url) => {
                    const items = [];
                    const containers = document.querySelectorAll(sel.couponContainer);

                    containers.forEach((container, index) => {
                        try {
                            const coupon = {
                                title: null,
                                description: null,
                                discount_text: null,
                                coupon_code: null,
                                image_url: null,
                                source_url: url,
                                scraped_at: new Date().toISOString(),
                            };

                            // Extract title
                            const titleEl = container.querySelector(sel.title);
                            if (titleEl) {
                                coupon.title = titleEl.textContent?.trim();
                            }

                            // Extract discount
                            const discountEl = container.querySelector(sel.discount);
                            if (discountEl) {
                                coupon.discount_text = discountEl.textContent?.trim();
                            }

                            // Extract coupon code
                            const codeEl = container.querySelector(sel.code);
                            if (codeEl) {
                                coupon.coupon_code = codeEl.textContent?.trim();
                            }

                            // Extract image
                            const imgEl = container.querySelector(sel.image);
                            if (imgEl) {
                                coupon.image_url = imgEl.src || imgEl.getAttribute('data-src');
                            }

                            // Extract link
                            const linkEl = container.querySelector(sel.link);
                            if (linkEl && linkEl.href) {
                                coupon.source_url = linkEl.href;
                            }

                            // Only add if we have essential data
                            if (coupon.title && (coupon.discount_text || coupon.coupon_code)) {
                                items.push(coupon);
                            }
                        } catch (error) {
                            console.error('Error extracting coupon:', error);
                        }
                    });

                    return items;
                },
                selectors,
                sourceUrl
            );

            return this.processCoupons(coupons);
        } catch (error) {
            this.logger.error('❌ Failed to extract coupons:', error);
            return [];
        }
    }

    processCoupons(rawCoupons) {
        return rawCoupons
            .map(coupon => {
                try {
                    // Parse discount
                    const discountInfo = this.parseDiscount(coupon.discount_text);

                    // Generate description if missing
                    if (!coupon.description && coupon.title) {
                        coupon.description = `${coupon.title} - Penawaran menarik dari ${this.platform.name}`;
                    }

                    // Set validity period (default 30 days)
                    const validUntil = new Date();
                    validUntil.setDate(validUntil.getDate() + 30);

                    return {
                        ...coupon,
                        platform_id: this.platform.id,
                        merchant_id: null, // Will be resolved later
                        discount_type: discountInfo.type,
                        discount_value: discountInfo.value,
                        status: 'active',
                        is_featured: Math.random() > 0.9, // 10% chance
                        valid_until: validUntil.toISOString(),
                        description: coupon.description?.substring(0, 500), // Limit length
                    };
                } catch (error) {
                    this.logger.error('Error processing coupon:', error);
                    return null;
                }
            })
            .filter(Boolean);
    }

    parseDiscount(discountText) {
        if (!discountText) {
            return { type: 'percentage', value: 0 };
        }

        const text = discountText.toString().toLowerCase().trim();

        // Percentage discount
        const percentMatch = text.match(/(\d+)%/);
        if (percentMatch) {
            return {
                type: 'percentage',
                value: parseInt(percentMatch[1]),
            };
        }

        // Fixed amount (Rupiah)
        const rupiahMatch = text.match(/rp\s*([\d.,]+)/);
        if (rupiahMatch) {
            const amount = parseInt(rupiahMatch[1].replace(/[.,]/g, ''));
            return {
                type: 'fixed',
                value: amount,
            };
        }

        // Free shipping
        if (text.includes('gratis') && text.includes('ongkir')) {
            return {
                type: 'shipping',
                value: 0,
            };
        }

        // Cashback
        if (text.includes('cashback')) {
            const cashbackMatch = text.match(/(\d+)%|rp\s*([\d.,]+)/);
            if (cashbackMatch) {
                const value = cashbackMatch[1]
                    ? parseInt(cashbackMatch[1])
                    : parseInt(cashbackMatch[2].replace(/[.,]/g, ''));
                return {
                    type: 'cashback',
                    value: value,
                };
            }
        }

        // BOGO (Buy One Get One)
        if ((text.includes('buy') && text.includes('get')) || (text.includes('beli') && text.includes('gratis'))) {
            return {
                type: 'bogo',
                value: 50, // Assume 50% value for BOGO
            };
        }

        // Default
        return {
            type: 'percentage',
            value: 10,
        };
    }

    async scrape() {
        try {
            await this.initialize();
            await this.launchBrowser();

            const allCoupons = [];
            let totalFound = 0;
            let totalSaved = 0;
            let totalErrors = 0;

            // Scrape each endpoint
            for (const [endpointName, endpointPath] of Object.entries(this.platform.endpoints)) {
                try {
                    const coupons = await this.scrapeEndpoint(endpointPath, this.platform.selectors);
                    allCoupons.push(...coupons);
                    totalFound += coupons.length;

                    // Add delay between endpoints
                    await this.delay(this.config.global.delayBetweenRequests);
                } catch (error) {
                    this.logger.error(`❌ Failed to scrape ${endpointName}:`, error);
                    totalErrors++;
                }
            }

            // Save coupons to database
            if (allCoupons.length > 0) {
                const saveResult = await this.database.saveCouponBatch(allCoupons);
                totalSaved = saveResult.saved;
                totalErrors += saveResult.errors;
            }

            // Update session
            const duration = Date.now() - this.startTime;
            await this.database.updateScrapeSession(this.sessionData.id, {
                status: 'completed',
                completed_at: new Date(),
                duration_ms: duration,
                items_found: totalFound,
                items_saved: totalSaved,
                items_failed: totalErrors,
            });

            this.logger.info(`✅ Scraping completed: ${totalSaved}/${totalFound} coupons saved`);

            return {
                platform: this.platform.name,
                found: totalFound,
                saved: totalSaved,
                errors: totalErrors,
                duration: duration,
            };
        } catch (error) {
            this.logger.error('❌ Scraping failed:', error);

            // Update session with error
            if (this.sessionData) {
                await this.database.updateScrapeSession(this.sessionData.id, {
                    status: 'failed',
                    completed_at: new Date(),
                    duration_ms: Date.now() - this.startTime,
                    error_details: {
                        message: error.message,
                        stack: error.stack,
                    },
                });
            }

            throw error;
        } finally {
            await this.cleanup();
        }
    }

    async cleanup() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.logger.info('🌐 Browser closed');
            }
        } catch (error) {
            this.logger.error('❌ Cleanup error:', error);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BaseScraper;
