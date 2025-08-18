#!/usr/bin/env node

/**
 * Simple Demo: Real Coupon Usage
 * Basic demonstration without external dependencies
 */

const SQLiteManager = require('../core/SQLiteManager');

async function simpleCouponDemo() {
    console.log('\n🛒 DEMO: Real Coupon Usage System\n');
    console.log('This demo shows how to use scraped coupons for actual purchases\n');

    const database = new SQLiteManager();

    try {
        // Initialize database
        console.log('🔧 Connecting to database...');
        await database.ensureInitialized();
        console.log('✅ Database connected\n');

        // Step 1: Show available coupons
        console.log('📋 Step 1: Available Coupons from Database\n');

        const platforms = ['shopee', 'tokopedia', 'lazada', 'blibli'];

        for (const platform of platforms) {
            console.log(`${platform.toUpperCase()}:`);

            const coupons = await new Promise((resolve, reject) => {
                const query = `
                    SELECT c.*, p.name as platform_name, p.slug as platform_slug
                    FROM coupons c
                    JOIN platforms p ON c.platform_id = p.id
                    WHERE p.slug = ? AND c.status = 'active'
                    ORDER BY c.scraped_at DESC
                    LIMIT 3
                `;
                database.db.all(query, [platform], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (coupons.length === 0) {
                console.log('  No coupons available\n');
                continue;
            }

            coupons.forEach((coupon, index) => {
                console.log(`  ${index + 1}. ${coupon.title}`);
                console.log(`     Code: ${coupon.coupon_code || 'No code'}`);
                console.log(
                    `     Discount: ${coupon.discount_type} - ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ''}`
                );
                console.log(`     Source: ${coupon.source_url}`);
            });
            console.log('');
        }

        // Step 2: Show coupons with actual codes
        console.log('🎫 Step 2: Coupons with Usable Codes\n');

        const usableCoupons = await new Promise((resolve, reject) => {
            const query = `
                SELECT c.*, p.name as platform_name, p.slug as platform_slug
                FROM coupons c
                JOIN platforms p ON c.platform_id = p.id
                WHERE c.status = 'active'
                AND c.coupon_code IS NOT NULL 
                AND c.coupon_code != ''
                ORDER BY c.scraped_at DESC
                LIMIT 10
            `;
            database.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (usableCoupons.length === 0) {
            console.log('No coupons with codes found.');
        } else {
            console.log(`Found ${usableCoupons.length} coupons with usable codes:\n`);

            usableCoupons.forEach((coupon, index) => {
                console.log(`${index + 1}. Platform: ${coupon.platform_name}`);
                console.log(`   Title: ${coupon.title}`);
                console.log(`   Code: ${coupon.coupon_code}`);
                console.log(
                    `   Discount: ${coupon.discount_type} - ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ''}`
                );
                console.log(`   URL: ${coupon.source_url}`);
                console.log('');
            });
        }

        // Step 3: Show how to use these coupons
        console.log('📖 Step 3: How to Use These Coupons\n');

        if (usableCoupons.length > 0) {
            const sampleCoupon = usableCoupons[0];

            console.log('Example usage with CLI commands:\n');
            console.log(`1. List coupons for ${sampleCoupon.platform_slug}:`);
            console.log(`   npm run coupons:list -- -p ${sampleCoupon.platform_slug}\n`);

            console.log(`2. Test coupon validity:`);
            console.log(`   npm run coupons:test -- -c ${sampleCoupon.coupon_code} -p ${sampleCoupon.platform_slug}\n`);

            console.log(`3. Simulate purchase:`);
            console.log(
                `   npm run coupons:buy -- -u "https://${sampleCoupon.platform_slug}.co.id/product/123" -c ${sampleCoupon.coupon_code} -p ${sampleCoupon.platform_slug}\n`
            );

            console.log(`4. Find best coupon for a product:`);
            console.log(
                `   npm run coupons:best -- -u "https://${sampleCoupon.platform_slug}.co.id/product/123" -p ${sampleCoupon.platform_slug}\n`
            );
        }

        // Step 4: Show statistics
        console.log('📊 Step 4: Coupon Statistics\n');

        const stats = await new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    p.name as platform_name,
                    p.slug as platform_slug,
                    COUNT(c.id) as total_coupons,
                    COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_coupons,
                    COUNT(CASE WHEN c.coupon_code IS NOT NULL AND c.coupon_code != '' THEN 1 END) as coupons_with_codes,
                    MAX(c.scraped_at) as last_scraped
                FROM platforms p
                LEFT JOIN coupons c ON p.id = c.platform_id
                GROUP BY p.id, p.name, p.slug 
                ORDER BY total_coupons DESC
            `;
            database.db.all(query, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('Platform Statistics:');
        stats.forEach(stat => {
            console.log(`${stat.platform_name}:`);
            console.log(`  Total Coupons: ${stat.total_coupons}`);
            console.log(`  Active Coupons: ${stat.active_coupons}`);
            console.log(`  Coupons with Codes: ${stat.coupons_with_codes}`);
            console.log(`  Last Scraped: ${stat.last_scraped || 'Never'}`);
            console.log('');
        });

        // Step 5: Real usage instructions
        console.log('💡 Step 5: Real-World Usage Instructions\n');

        console.log('To use these coupons for real purchases:');
        console.log('1. Copy the coupon code from the list above');
        console.log('2. Visit the e-commerce platform website');
        console.log('3. Add products to your cart');
        console.log('4. Go to checkout');
        console.log('5. Look for "Voucher" or "Promo Code" field');
        console.log('6. Paste the coupon code and apply');
        console.log('7. Complete your purchase with the discount!\n');

        console.log('Available CLI Commands:');
        console.log('- npm run purchase:demo     # Run this demo');
        console.log('- npm run coupons:list      # List available coupons');
        console.log('- npm run coupons:test      # Test coupon validity');
        console.log('- npm run coupons:buy       # Simulate purchase');
        console.log('- npm run coupons:best      # Find best coupon');

        console.log('\n🎉 Demo completed successfully!');
        console.log('You now have access to real coupon codes for shopping!\n');
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        database.close();
    }
}

// Run the demo
if (require.main === module) {
    simpleCouponDemo().catch(console.error);
}

module.exports = { simpleCouponDemo };
