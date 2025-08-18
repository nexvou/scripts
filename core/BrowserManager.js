const puppeteer = require('puppeteer');
const Logger = require('../utils/Logger');

class BrowserManager {
    constructor() {
        this.logger = new Logger('BrowserManager');
        this.browser = null;
        this.browserRestartCount = 0;
        this.maxRestarts = 3;
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
            this.logger.info('🌐 Launching browser...');

            try {
                // Simplified configuration for better compatibility
                const launchOptions = {
                    headless: 'new',
                    timeout: 15000, // Reduce timeout to 15 seconds for faster failure
                    protocolTimeout: 15000,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--no-first-run',
                        '--disable-gpu',
                        '--disable-web-security',
                        '--single-process', // Force single process for stability
                        '--no-zygote',
                    ],
                    defaultViewport: {
                        width: 1366,
                        height: 768,
                    },
                };

                // Try to use system Chrome first (more stable)
                const fs = require('fs');
                const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

                if (fs.existsSync(systemChrome)) {
                    launchOptions.executablePath = systemChrome;
                    this.logger.info(`🔍 Using system Chrome: ${systemChrome}`);
                } else {
                    // Fallback to Puppeteer Chrome
                    const os = require('os');
                    const puppeteerChrome = `${os.homedir()}/.cache/puppeteer/chrome/mac-121.0.6167.85/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

                    if (fs.existsSync(puppeteerChrome)) {
                        launchOptions.executablePath = puppeteerChrome;
                        this.logger.info(`🔍 Using Puppeteer Chrome: ${puppeteerChrome}`);
                    } else {
                        this.logger.warn('⚠️ No Chrome executable found, using default');
                    }
                }

                // Launch with timeout
                const launchPromise = puppeteer.launch(launchOptions);
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Browser launch timeout after 15 seconds')), 15000);
                });

                this.browser = await Promise.race([launchPromise, timeoutPromise]);
                this.logger.info('🌐 Browser launched successfully');
            } catch (error) {
                this.logger.error('❌ Failed to launch browser:', error.message);
                throw new Error(`Browser launch failed: ${error.message}`);
            }
        }

        return this.browser;
    }

    async createPage(options = {}) {
        const maxRetries = 2; // Reduce retries for faster failure

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.info(`📄 Creating new page (attempt ${attempt})...`);

                // Get browser with shorter timeout
                const browserPromise = this.getBrowser();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Browser creation timeout')), 10000); // 10 seconds
                });

                const browser = await Promise.race([browserPromise, timeoutPromise]);

                // Create page with shorter timeout
                const pagePromise = browser.newPage();
                const pageTimeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Page creation timeout')), 5000); // 5 seconds
                });

                const page = await Promise.race([pagePromise, pageTimeoutPromise]);

                this.logger.info('🔧 Configuring page settings...');

                // Minimal configuration for speed
                await page.setUserAgent(this.getRandomUserAgent());
                await page.setViewport({
                    width: options.width || 1366,
                    height: options.height || 768,
                });

                this.logger.info('✅ Page created and configured successfully');
                return page;
            } catch (error) {
                this.logger.error(`❌ Failed to create page (attempt ${attempt}):`, error.message);

                if (attempt === maxRetries) {
                    throw new Error(`Failed to create page after ${maxRetries} attempts: ${error.message}`);
                }

                // Short wait before retry
                await this.delay(1000);
            }
        }
    }

    async restartBrowser() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            await this.delay(3000); // Wait 3 seconds before restarting
            this.logger.info('🔄 Browser restarted');
        } catch (error) {
            this.logger.error('❌ Error restarting browser:', error.message);
        }
    }

    async navigateWithRetry(page, url, options = {}) {
        const maxRetries = options.maxRetries || 3;
        const timeout = options.timeout || 30000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.info(`🔗 Navigating to ${url} (attempt ${attempt})`);

                await page.goto(url, {
                    waitUntil: options.waitUntil || 'domcontentloaded',
                    timeout: Math.min(timeout, 15000), // Max 15 seconds
                });

                this.logger.info(`✅ Successfully navigated to ${url}`);

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
                this.logger.warn(`❌ Navigation attempt ${attempt} failed: ${error.message}`);

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
