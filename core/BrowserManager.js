const puppeteer = require('puppeteer');
const Logger = require('../utils/Logger');

class BrowserManager {
    constructor() {
        this.logger = new Logger('BrowserManager');
        this.browser = null;
        this.browserRestartCount = 0;
        this.maxRestarts = 3;
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        ];
    }

    async getBrowser() {
        if (!this.browser) {
            this.logger.info('🌐 Launching browser...');

            try {
                // Simplified configuration for better compatibility
                const launchOptions = {
                    headless: true,
                    timeout: 60000,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-blink-features=AutomationControlled',
                        '--exclude-switches=enable-automation',
                        '--disable-extensions-except',
                        '--disable-plugins-except',
                        '--disable-default-apps',
                        '--disable-sync',
                        '--disable-translate',
                        '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                        '--disable-ipc-flooding-protection',
                        '--no-first-run',
                        '--no-default-browser-check',
                        '--mute-audio',
                        '--hide-scrollbars',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-background-timer-throttling',
                        '--disable-features=VizDisplayCompositor',
                    ],
                    defaultViewport: {
                        width: 1366,
                        height: 768,
                    },
                    ignoreHTTPSErrors: true,
                    ignoreDefaultArgs: ['--enable-automation'],
                };

                // Try browsers in order of preference
                const fs = require('fs');
                const browserPaths = [
                    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
                    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                    `${require('os').homedir()}/.cache/puppeteer/chrome/mac-121.0.6167.85/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
                ];

                let browserFound = false;
                for (const browserPath of browserPaths) {
                    if (fs.existsSync(browserPath)) {
                        launchOptions.executablePath = browserPath;
                        const browserName = browserPath.includes('Brave')
                            ? 'Brave Browser'
                            : browserPath.includes('Google Chrome.app')
                              ? 'System Chrome'
                              : 'Puppeteer Chrome';
                        this.logger.info(`🔍 Using ${browserName}: ${browserPath}`);
                        browserFound = true;
                        break;
                    }
                }

                if (!browserFound) {
                    this.logger.warn('⚠️ No browser executable found, using default');
                }

                // Launch browser directly without additional timeout
                this.browser = await puppeteer.launch(launchOptions);
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

                // Enhanced stealth configuration
                await page.setUserAgent(this.getRandomUserAgent());
                await page.setViewport({
                    width: options.width || 1366,
                    height: options.height || 768,
                });

                // Remove automation indicators
                await page.evaluateOnNewDocument(() => {
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                    });

                    // Remove automation flags
                    delete navigator.__proto__.webdriver;

                    // Mock plugins
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3, 4, 5],
                    });

                    // Mock languages
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['en-US', 'en', 'id'],
                    });

                    // Mock permissions
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = parameters =>
                        parameters.name === 'notifications'
                            ? Promise.resolve({ state: Notification.permission })
                            : originalQuery(parameters);
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

                // Add random delay before navigation
                await this.delay(Math.random() * 2000 + 1000); // 1-3 seconds

                await page.goto(url, {
                    waitUntil: options.waitUntil || 'networkidle2',
                    timeout: Math.min(timeout, 25000),
                });

                this.logger.info(`✅ Successfully navigated to ${url}`);

                // Add random delay after navigation
                await this.delay(Math.random() * 3000 + 2000); // 2-5 seconds

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
            this.logger.info('🧪 Testing browser functionality...');
            const page = await this.createPage();
            await page.goto('https://httpbin.org/user-agent', {
                timeout: 15000,
                waitUntil: 'domcontentloaded',
            });

            const content = await page.content();
            await page.close();

            const success = content.includes('user-agent');
            this.logger.info(success ? '✅ Browser test passed' : '❌ Browser test failed');
            return success;
        } catch (error) {
            this.logger.error('❌ Browser test failed:', error.message);
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
