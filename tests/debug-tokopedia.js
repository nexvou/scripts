#!/usr/bin/env node

const BrowserManager = require('../core/BrowserManager');

async function debugTokopedia() {
    const browserManager = new BrowserManager();

    try {
        console.log('🔍 Debugging Tokopedia selectors...');

        const page = await browserManager.createPage();

        // Navigate to Tokopedia deals
        await page.goto('https://www.tokopedia.com/deals', {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        console.log('📄 Page loaded, checking content...');

        // Get page title
        const title = await page.title();
        console.log('📋 Page title:', title);

        // Check if page loaded properly
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));
        console.log('📝 Body text preview:', bodyText);

        // Test current selectors
        const currentSelectors = [
            '[data-testid="divPromoCard"]',
            '[data-testid="spnPromoName"]',
            '[data-testid="divProductWrapper"]',
            '.css-1sn1xa2', // Common Tokopedia class
            '[data-testid="master-product-card"]',
            '.prd_container-card',
            '.css-bk6tzz', // Product card
            '.css-1asz3by', // Another common class
        ];

        console.log('\n🧪 Testing selectors:');
        for (const selector of currentSelectors) {
            try {
                const elements = await page.$$(selector);
                console.log(`${selector}: ${elements.length} elements found`);

                if (elements.length > 0) {
                    // Get text content of first element
                    const firstText = await page.evaluate(sel => {
                        const el = document.querySelector(sel);
                        return el ? el.textContent.substring(0, 100) : 'No text';
                    }, selector);
                    console.log(`  First element text: ${firstText}`);
                }
            } catch (error) {
                console.log(`${selector}: ERROR - ${error.message}`);
            }
        }

        // Get all possible item containers
        console.log('\n🔍 Looking for common patterns...');
        const commonPatterns = await page.evaluate(() => {
            const patterns = [];

            // Look for elements with common e-commerce patterns
            const selectors = [
                '[class*="product"]',
                '[class*="item"]',
                '[class*="card"]',
                '[data-testid*="product"]',
                '[data-testid*="item"]',
                '[data-testid*="card"]',
            ];

            selectors.forEach(selector => {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        patterns.push({
                            selector: selector,
                            count: elements.length,
                            sample: elements[0].className,
                        });
                    }
                } catch (e) {}
            });

            return patterns.slice(0, 10);
        });

        console.log('📦 Found patterns:', commonPatterns);

        // Take screenshot
        await page.screenshot({ path: 'tokopedia-debug.png', fullPage: false });
        console.log('📸 Screenshot saved as tokopedia-debug.png');

        await page.close();
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    } finally {
        await browserManager.close();
    }
}

debugTokopedia();
