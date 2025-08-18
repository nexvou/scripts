#!/usr/bin/env node

/**
 * Coupon CLI Tool
 * Simple tool to list and use scraped coupons
 */

const { Command } = require('commander');
const SQLiteManager = require('../../core/SQLiteManager');

const program = new Command();

program.name('coupon-cli').description('Tool to manage and use scraped coupons').version('1.0.0');

// Helper function to execute raw SQL queries
function executeQuery(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// List available coupons
program
    .command('list')
    .description('List available coupons for a platform')
    .option('-p, --platform <platform>', 'Platform (shopee, tokopedia, lazada, blibli)', 'all')
    .option('-l, --limit <number>', 'Number of coupons to show', '10')
    .action(async options => {
        const db = new SQLiteManager();

        try {
            await db.ensureInitialized();

            console.log(
                `\n🎫 Available Coupons${options.platform !== 'all' ? ` for ${options.platform.toUpperCase()}` : ''}\n`
            );

            let query = `
                SELECT c.*, p.name as platform_name, p.slug as platform_slug
                FROM coupons c
                JOIN platforms p ON c.platform_id = p.id
                WHERE c.status = 'active'
                AND c.coupon_code IS NOT NULL 
                AND c.coupon_code != ''
            `;

            const params = [];

            if (options.platform !== 'all') {
                query += ' AND p.slug = ?';
                params.push(options.platform);
            }

            query += ' ORDER BY p.name, c.scraped_at DESC LIMIT ?';
            params.push(parseInt(options.limit));

            const coupons = await executeQuery(db, query, params);

            if (coupons.length === 0) {
                console.log('No coupons found.');
                return;
            }

            let currentPlatform = '';
            coupons.forEach(coupon => {
                if (coupon.platform_name !== currentPlatform) {
                    currentPlatform = coupon.platform_name;
                    console.log(`--- ${currentPlatform.toUpperCase()} ---`);
                }

                console.log(`${coupon.coupon_code} - ${coupon.title}`);
                console.log(
                    `  Discount: ${coupon.discount_type} ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ''}`
                );
                console.log(`  Source: ${coupon.source_url}`);
                console.log('');
            });
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            db.close();
        }
    });

// Show coupon details
program
    .command('show')
    .description('Show details of a specific coupon')
    .requiredOption('-c, --code <code>', 'Coupon code to show')
    .action(async options => {
        const db = new SQLiteManager();

        try {
            await db.ensureInitialized();

            console.log(`\n🔍 Coupon Details: ${options.code}\n`);

            const query = `
                SELECT c.*, p.name as platform_name, p.slug as platform_slug
                FROM coupons c
                JOIN platforms p ON c.platform_id = p.id
                WHERE c.coupon_code = ?
                LIMIT 1
            `;

            const coupons = await executeQuery(db, query, [options.code]);

            if (coupons.length === 0) {
                console.log('Coupon not found.');
                return;
            }

            const coupon = coupons[0];

            console.log(`Title: ${coupon.title}`);
            console.log(`Code: ${coupon.coupon_code}`);
            console.log(`Platform: ${coupon.platform_name}`);
            console.log(
                `Discount: ${coupon.discount_type} - ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ''}`
            );
            console.log(`Status: ${coupon.status}`);
            console.log(`Source: ${coupon.source_url}`);
            if (coupon.valid_until) {
                console.log(`Valid Until: ${coupon.valid_until}`);
            }
            console.log(`Last Scraped: ${coupon.scraped_at}`);
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            db.close();
        }
    });

// Show all coupons with codes
program
    .command('all')
    .description('Show all available coupons with codes')
    .option('-l, --limit <number>', 'Number of coupons to show', '20')
    .action(async options => {
        const db = new SQLiteManager();

        try {
            await db.ensureInitialized();

            console.log('\n🎫 All Available Coupons with Codes\n');

            const query = `
                SELECT c.*, p.name as platform_name, p.slug as platform_slug
                FROM coupons c
                JOIN platforms p ON c.platform_id = p.id
                WHERE c.status = 'active'
                AND c.coupon_code IS NOT NULL 
                AND c.coupon_code != ''
                ORDER BY p.name, c.scraped_at DESC
                LIMIT ?
            `;

            const coupons = await executeQuery(db, query, [parseInt(options.limit)]);

            if (coupons.length === 0) {
                console.log('No coupons with codes found.');
                return;
            }

            let currentPlatform = '';
            coupons.forEach(coupon => {
                if (coupon.platform_name !== currentPlatform) {
                    currentPlatform = coupon.platform_name;
                    console.log(`\n--- ${currentPlatform.toUpperCase()} ---`);
                }

                console.log(`${coupon.coupon_code} - ${coupon.title}`);
                console.log(
                    `  Discount: ${coupon.discount_type} ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ''}`
                );
                console.log(`  URL: ${coupon.source_url}`);
            });
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            db.close();
        }
    });

// Real usage instructions
program
    .command('use')
    .description('Show instructions for using a coupon')
    .requiredOption('-c, --code <code>', 'Coupon code to use')
    .action(async options => {
        const db = new SQLiteManager();

        try {
            await db.ensureInitialized();

            const query = `
                SELECT c.*, p.name as platform_name, p.slug as platform_slug
                FROM coupons c
                JOIN platforms p ON c.platform_id = p.id
                WHERE c.coupon_code = ?
                LIMIT 1
            `;

            const coupons = await executeQuery(db, query, [options.code]);

            if (coupons.length === 0) {
                console.log('Coupon not found.');
                return;
            }

            const coupon = coupons[0];

            console.log(`\n🛒 How to Use Coupon: ${coupon.coupon_code}\n`);
            console.log(`Platform: ${coupon.platform_name}`);
            console.log(
                `Discount: ${coupon.discount_type} - ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : ''}`
            );
            console.log(`\nSteps to use this coupon:`);
            console.log(`1. Visit ${coupon.platform_name} website`);
            console.log(`2. Browse and add products to your cart`);
            console.log(`3. Go to checkout/cart page`);
            console.log(`4. Look for "Voucher", "Promo Code", or "Kupon" field`);
            console.log(`5. Enter this code: ${coupon.coupon_code}`);
            console.log(`6. Click "Apply" or "Gunakan"`);
            console.log(`7. Verify the discount is applied`);
            console.log(`8. Complete your purchase!`);

            if (coupon.source_url) {
                console.log(`\nOriginal source: ${coupon.source_url}`);
            }
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            db.close();
        }
    });

// Statistics
program
    .command('stats')
    .description('Show coupon statistics')
    .action(async () => {
        const db = new SQLiteManager();

        try {
            await db.ensureInitialized();

            console.log('\n📊 Coupon Statistics\n');

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

            const stats = await executeQuery(db, query);

            stats.forEach(stat => {
                console.log(`${stat.platform_name}:`);
                console.log(`  Total Coupons: ${stat.total_coupons}`);
                console.log(`  Active Coupons: ${stat.active_coupons}`);
                console.log(`  Coupons with Codes: ${stat.coupons_with_codes}`);
                console.log(`  Last Scraped: ${stat.last_scraped || 'Never'}`);
                console.log('');
            });
        } catch (error) {
            console.error('Error:', error.message);
        } finally {
            db.close();
        }
    });

program.parse();
