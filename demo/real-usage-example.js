#!/usr/bin/env node

/**
 * Real Usage Example: How to Use Scraped Coupons for Actual Purchases
 * This demonstrates the complete workflow from scraping to real purchase
 */

const SQLiteManager = require('../core/SQLiteManager');

async function realUsageExample() {
    console.log('\n🛒 REAL USAGE EXAMPLE: Using Scraped Coupons for Actual Purchases\n');
    console.log('This example shows you how to use the coupon codes we scraped for real shopping!\n');

    const database = new SQLiteManager();

    try {
        await database.ensureInitialized();

        // Step 1: Show available coupons
        console.log('🎫 STEP 1: Available Coupon Codes\n');

        const allCoupons = await new Promise((resolve, reject) => {
            const query = `
                SELECT c.*, p.name as platform_name, p.slug as platform_slug
                FROM coupons c
                JOIN platforms p ON c.platform_id = p.id
                WHERE c.status = 'active'
                AND c.coupon_code IS NOT NULL 
                AND c.coupon_code != ''
                ORDER BY p.name
            `;
            database.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        allCoupons.forEach((coupon, index) => {
            console.log(`${index + 1}. ${coupon.platform_name}: ${coupon.coupon_code}`);
            console.log(`   ${coupon.title}`);
            console.log(
                `   Discount: ${coupon.discount_type} ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ''}`
            );
            console.log('');
        });

        // Step 2: Real usage instructions for each platform
        console.log('🛍️  STEP 2: How to Use These Coupons for Real Shopping\n');

        const platforms = {
            Shopee: {
                website: 'https://shopee.co.id',
                steps: [
                    'Go to shopee.co.id',
                    'Search for products you want to buy',
                    'Add items to your cart',
                    'Click on cart icon (top right)',
                    'Click "Checkout" button',
                    'Look for "Voucher Shopee" section',
                    'Click "Pilih atau masukkan kode"',
                    'Enter coupon code and click "OK"',
                    'Verify discount is applied',
                    'Complete payment',
                ],
            },
            Tokopedia: {
                website: 'https://www.tokopedia.com',
                steps: [
                    'Go to tokopedia.com',
                    'Search and add products to cart',
                    'Go to cart page',
                    'Click "Beli Langsung" or "Checkout"',
                    'Look for "Gunakan Kupon" section',
                    'Click "Pilih Kupon"',
                    'Enter coupon code',
                    'Apply and verify discount',
                    'Complete payment',
                ],
            },
            Lazada: {
                website: 'https://www.lazada.co.id',
                steps: [
                    'Go to lazada.co.id',
                    'Add products to shopping cart',
                    'Go to cart and click "Proceed to Checkout"',
                    'Look for "Voucher" section',
                    'Click "Enter Voucher Code"',
                    'Input coupon code and apply',
                    'Check if discount is applied',
                    'Complete checkout process',
                ],
            },
            Blibli: {
                website: 'https://www.blibli.com',
                steps: [
                    'Go to blibli.com',
                    'Add desired products to cart',
                    'Click cart icon and "Checkout"',
                    'Look for "Voucher" or "Promo" section',
                    'Enter voucher code',
                    'Click "Gunakan" to apply',
                    'Verify discount amount',
                    'Proceed with payment',
                ],
            },
        };

        // Show detailed instructions for each platform that has coupons
        const availablePlatforms = [...new Set(allCoupons.map(c => c.platform_name))];

        availablePlatforms.forEach(platformName => {
            const platformCoupons = allCoupons.filter(c => c.platform_name === platformName);
            const platformInfo = platforms[platformName];

            console.log(`--- ${platformName.toUpperCase()} ---`);
            console.log(`Website: ${platformInfo.website}`);
            console.log(`Available Coupons: ${platformCoupons.map(c => c.coupon_code).join(', ')}`);
            console.log('\nStep-by-step instructions:');

            platformInfo.steps.forEach((step, index) => {
                console.log(`  ${index + 1}. ${step}`);
            });
            console.log('');
        });

        // Step 3: Example real purchase scenario
        console.log('💡 STEP 3: Example Real Purchase Scenario\n');

        if (allCoupons.length > 0) {
            const exampleCoupon = allCoupons[0];

            console.log(`Let's say you want to buy something on ${exampleCoupon.platform_name}:`);
            console.log(`\n1. You have coupon code: ${exampleCoupon.coupon_code}`);
            console.log(
                `2. This gives you: ${exampleCoupon.discount_type} ${exampleCoupon.discount_value}${exampleCoupon.discount_type === 'percentage' ? '%' : ''} discount`
            );
            console.log(`3. Go to: ${platforms[exampleCoupon.platform_name].website}`);
            console.log(`4. Find a product you want to buy`);
            console.log(`5. Add it to cart and go to checkout`);
            console.log(`6. Enter coupon code: ${exampleCoupon.coupon_code}`);
            console.log(`7. See the discount applied!`);
            console.log(`8. Complete your purchase and save money! 💰`);
        }

        // Step 4: Tips for successful coupon usage
        console.log('\n🎯 STEP 4: Tips for Successful Coupon Usage\n');

        const tips = [
            'Always check coupon expiration dates',
            'Some coupons have minimum purchase requirements',
            'Try different coupons to find the best discount',
            'Coupons may not work with already discounted items',
            'Keep your scraped coupon database updated',
            'Some coupons are limited to first-time users only',
            'Stack coupons with cashback apps for extra savings',
            'Check if the coupon applies to your specific product category',
        ];

        tips.forEach((tip, index) => {
            console.log(`${index + 1}. ${tip}`);
        });

        // Step 5: CLI commands for easy access
        console.log('\n⚡ STEP 5: Quick CLI Commands\n');

        console.log('Use these commands to quickly access your coupons:');
        console.log('');
        console.log('# List all available coupons');
        console.log('npm run coupons:all');
        console.log('');
        console.log('# List coupons for specific platform');
        console.log('npm run coupons:list -- -p shopee');
        console.log('');
        console.log('# Get usage instructions for a coupon');
        console.log('npm run coupons:use -- -c SHOPEE50');
        console.log('');
        console.log('# Show detailed coupon information');
        console.log('npm run coupons:show -- -c BLIBLI343');
        console.log('');
        console.log('# View statistics');
        console.log('npm run coupons:stats');

        console.log('\n🎉 SUCCESS! You now know how to use scraped coupons for real purchases!');
        console.log('\nHappy shopping and saving money! 💰🛒\n');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        database.close();
    }
}

// Run the example
if (require.main === module) {
    realUsageExample().catch(console.error);
}

module.exports = { realUsageExample };
