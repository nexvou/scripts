const puppeteer = require('puppeteer');
const Logger = require('../utils/Logger');

class BrowserManager {
    constructor() {
        this.logger = new Logger('BrowserManager');
        this.browser = null;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
        ];
    }

    async getBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                ],
                defaultViewport: {
                    width: 1366,
                    height: 768,
                },
            });

            this.logger.info('🌐 Browser launched');
        }

        return this.browser;
    }

    async createPage(options = {}) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        // Set random user agent
        await page.setUserAgent(this.getRandomUserAgent());

        // Set viewport
        await page.setViewport({
            width: options.width || 1366,
            height: options.height || 768,
        });

        // Block unnecessary resources for faster loading
        if (options.blockResources !== false) {
            await page.setRequestInterception(true);
            page.on('request', req => {
                const resourceType = req.resourceType();
                if (['stylesheet', 'font', 'image'].includes(resourceType) && !options.loadImages) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
        }

        // Set extra headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            Connection: 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        });

        return page;
    }

    async navigateWithRetry(page, url, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const timeout = options.timeout || 30000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.debug(`Navigating to ${url} (attempt ${attempt})`);

                await page.goto(url, {
                    waitUntil: options.waitUntil || 'networkidle2',
                    timeout,
                });

                // Wait for additional loading if specified
                if (options.waitFor) {
                    if (typeof options.waitFor === 'string') {
                        await page.waitForSelector(options.waitFor, { timeout: 10000 });
                    } else if (typeof options.waitFor === 'number') {
                        await this.delay(options.waitFor);
                    }
                }

                return true;
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

    async scrollPage(page, options = {}) {
        const scrollDelay = options.delay || 1000;
        const maxScrolls = options.maxScrolls || 3;

        for (let i = 0; i < maxScrolls; i++) {
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });
            await this.delay(scrollDelay);
        }

        // Scroll back to top
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });
    }

    async handleAntiBot(page) {
        try {
            // Check for common anti-bot elements
            const antiBot = await page.$('.cf-browser-verification, .g-recaptcha, [data-testid="captcha"]');

            if (antiBot) {
                this.logger.warn('Anti-bot protection detected, waiting...');
                await this.delay(5000);

                // Try to solve simple challenges
                const cloudflare = await page.$('.cf-browser-verification');
                if (cloudflare) {
                    await this.delay(10000); // Wait for Cloudflare to complete
                }
            }
        } catch (error) {
            this.logger.debug('Anti-bot check failed:', error.message);
        }
    }

    async test() {
        try {
            const page = await this.createPage();
            await page.goto('https://example.com', { timeout: 15000 });
            const title = await page.title();
            await page.close();

            return title.length > 0;
        } catch (error) {
            this.logger.error('Browser test failed:', error.message);
            return false;
        }
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.logger.info('🌐 Browser closed');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = BrowserManager;
