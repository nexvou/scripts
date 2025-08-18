#!/usr/bin/env node

const BrowserManager = require('../core/BrowserManager');

async function testBrowser() {
    const browserManager = new BrowserManager();

    try {
        console.log('🧪 Testing browser setup...');

        // Test browser launch
        const success = await browserManager.test();

        if (success) {
            console.log('✅ Browser test successful!');
            console.log('🎉 Browser is working correctly with your system');
        } else {
            console.log('❌ Browser test failed');
            console.log('🔧 Try running the scraper - it may still work with fallback methods');
        }
    } catch (error) {
        console.error('❌ Browser test error:', error.message);
        console.log('💡 Suggestions:');
        console.log('   1. Make sure Brave Browser is installed');
        console.log('   2. Try: npm install puppeteer-core');
        console.log('   3. Check if any security software is blocking browser launch');
    } finally {
        await browserManager.close();
        process.exit(0);
    }
}

testBrowser();
