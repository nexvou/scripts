#!/usr/bin/env node

const BrowserManager = require('../core/BrowserManager');

async function debugShopee() {
    const browserManager = new BrowserManager();

    try {
        console.log('🔍 Debugging Shopee selectors...');

        const page = await browserManager.createPage();

        // Navigate to Shopee flash sale
        await page.goto('https://shopee.co.id/flash_sale', {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });

        console.log('📄 Page loaded, checking content...');

        // Get page title
        const title = await page.title();
        console.log('📋 Page title:', title);

        // Check if page loaded properly
        const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 200));
        console.log('📝 Body text preview:', bodyText);

        // Test current selectors
        const currentSelectors = [
            '[data-sqe="link"] .stardust-card',
            '.flash-sale-item-card__title',
            '.shopee-search-item-result__text',
            '.item-card-special',
            '.shopee-item-card',
            '[data-testid="item-card"]',
        ];

        console.log('\n🧪 Testing selectors:');
        for (const selector of currentSelectors) {
            try {
                const elements = await page.$$(selector);
                console.log(`${selector}: ${elements.length} elements found`);
            } catch (error) {
                console.log(`${selector}: ERROR - ${error.message}`);
            }
        }

        // Get all possible item containers
        console.log('\n🔍 Looking for common item patterns...');
        const commonPatterns = await page.evaluate(() => {
            const patterns = [];

            // Look for elements with "item" in class name
            const itemElements = document.querySelectorAll('[class*="item"]');
            const itemClasses = new Set();
            itemElements.forEach(el => {
                el.classList.forEach(cls => {
                    if (cls.includes('item') || cls.includes('card') || cls.includes('product')) {
                        itemClasses.add(cls);
                    }
                });
            });

            return Array.from(itemClasses).slice(0, 10); // Top 10 classes
        });

        console.log('📦 Found item-related classes:', commonPatterns);

        // Take screenshot for manual inspection
        await page.screenshot({ path: 'shopee-debug.png', fullPage: false });
        console.log('📸 Screenshot saved as shopee-debug.png');

        await page.close();
    } catch (error) {
        console.error('❌ Debug error:', error.message);
    } finally {
        await browserManager.close();
    }
}

debugShopee();
