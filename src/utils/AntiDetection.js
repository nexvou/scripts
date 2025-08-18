/**
 * Anti-Detection Utilities
 * Helps avoid bot detection while scraping
 */

class AntiDetection {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
        ];
    }

    async setupPage(page) {
        // Set random user agent
        await page.setUserAgent(this.getRandomUserAgent());

        // Set extra headers to look more human
        await page.setExtraHTTPHeaders({
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Upgrade-Insecure-Requests': '1',
        });

        // Override webdriver detection
        await page.evaluateOnNewDocument(() => {
            // Remove webdriver property
            delete navigator.__proto__.webdriver;

            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['id-ID', 'id', 'en-US', 'en'],
            });

            // Override permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = parameters =>
                parameters.name === 'notifications' ? Promise.resolve({ state: 'granted' }) : originalQuery(parameters);
        });

        // Set viewport with slight randomization
        const width = 1366 + Math.floor(Math.random() * 100);
        const height = 768 + Math.floor(Math.random() * 100);

        await page.setViewport({
            width,
            height,
            deviceScaleFactor: 1,
            isMobile: false,
            hasTouch: false,
            isLandscape: true,
        });

        // Add mouse movement simulation
        await this.simulateHumanBehavior(page);
    }

    async simulateHumanBehavior(page) {
        // Random mouse movements
        await page.mouse.move(Math.random() * 1366, Math.random() * 768);

        // Random scroll
        await page.evaluate(() => {
            window.scrollBy(0, Math.random() * 100);
        });
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    async handleCaptcha(page) {
        // Check for common captcha elements
        const captchaSelectors = [
            '.g-recaptcha',
            '#captcha',
            '[data-testid="captcha"]',
            '.cf-browser-verification',
            '.hcaptcha-box',
        ];

        for (const selector of captchaSelectors) {
            const element = await page.$(selector);
            if (element) {
                throw new Error(`Captcha detected: ${selector}`);
            }
        }
    }

    async handleCloudflare(page) {
        // Wait for Cloudflare challenge to complete
        try {
            await page.waitForSelector('.cf-browser-verification', { timeout: 5000 });

            // Wait for challenge to complete (max 30 seconds)
            await page.waitForFunction(() => !document.querySelector('.cf-browser-verification'), { timeout: 30000 });
        } catch (error) {
            // No Cloudflare challenge or timeout
        }
    }

    async randomDelay(min = 1000, max = 3000) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }
}

export default AntiDetection;
