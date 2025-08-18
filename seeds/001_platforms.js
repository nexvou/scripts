/**
 * Seed platforms data
 */

export const seed = async function (knex) {
    // Delete existing entries
    await knex('platforms').del();

    // Insert platform data
    await knex('platforms').insert([
        {
            id: 1,
            name: 'Shopee',
            slug: 'shopee',
            base_url: 'https://shopee.co.id',
            logo_url: 'https://cf.shopee.co.id/file/shopee-logo.png',
            endpoints: JSON.stringify({
                flashSale: '/flash_sale',
                dailyDiscover: '/daily-discover',
                brands: '/brands',
                vouchers: '/voucher-deals',
            }),
            selectors: JSON.stringify({
                couponContainer: '[data-sqe="link"], .flash-sale-item, .voucher-card',
                title: '.flash-sale-item-card__title, .voucher-title, .product-title',
                discount: '.flash-sale-item-card__discount, .voucher-discount, .discount-label',
                price: '.flash-sale-item-card__price, .voucher-value, .price',
                code: '.voucher-code, .coupon-code',
                image: 'img[src], img[data-src]',
                link: 'a[href]',
            }),
            limits: JSON.stringify({
                maxItemsPerPage: 50,
                maxPages: 3,
                requestTimeout: 25000,
            }),
            is_active: true,
            priority: 1,
        },
        {
            id: 2,
            name: 'Tokopedia',
            slug: 'tokopedia',
            base_url: 'https://www.tokopedia.com',
            logo_url: 'https://images.tokopedia.net/img/tokopedia-logo.png',
            endpoints: JSON.stringify({
                promo: '/promo',
                flashSale: '/flash-sale',
                deals: '/deals',
                vouchers: '/voucher',
            }),
            selectors: JSON.stringify({
                couponContainer: '[data-testid="divPromoCard"], [data-testid="divProductWrapper"]',
                title: '[data-testid="spnPromoName"], [data-testid="spnProductName"]',
                discount: '[data-testid="spnPromoDiscount"], [data-testid="spnProductDiscount"]',
                price: '[data-testid="spnPromoPrice"], [data-testid="spnProductPrice"]',
                code: '[data-testid="spnPromoCode"]',
                image: '[data-testid="imgPromo"], [data-testid="imgProduct"]',
                link: 'a[href]',
            }),
            limits: JSON.stringify({
                maxItemsPerPage: 40,
                maxPages: 3,
                requestTimeout: 30000,
            }),
            is_active: true,
            priority: 2,
        },
        {
            id: 3,
            name: 'Lazada',
            slug: 'lazada',
            base_url: 'https://www.lazada.co.id',
            logo_url: 'https://id-live-01.slatic.net/p/lazada-logo.png',
            endpoints: JSON.stringify({
                flashSale: '/flash-sale',
                vouchers: '/vouchers',
                brands: '/brands',
                deals: '/deals',
            }),
            selectors: JSON.stringify({
                couponContainer: '.sale-item, .voucher-item, .deal-card',
                title: '.item-title-text, .voucher-title, .deal-title',
                discount: '.sale-percent, .voucher-value, .deal-discount',
                price: '.sale-price, .deal-price',
                code: '.voucher-code, .deal-code',
                image: '.item-img img, .voucher-img img',
                link: 'a[href]',
            }),
            limits: JSON.stringify({
                maxItemsPerPage: 35,
                maxPages: 2,
                requestTimeout: 35000,
            }),
            is_active: true,
            priority: 3,
        },
        {
            id: 4,
            name: 'Blibli',
            slug: 'blibli',
            base_url: 'https://www.blibli.com',
            logo_url: 'https://www.static-src.com/wcsstore/blibli-logo.png',
            endpoints: JSON.stringify({
                deals: '/deals',
                flashSale: '/flash-sale',
                vouchers: '/voucher',
            }),
            selectors: JSON.stringify({
                couponContainer: '.product-item, .voucher-card, .deal-item',
                title: '.product-title, .voucher-title, .deal-title',
                discount: '.product-discount, .voucher-discount, .deal-discount',
                price: '.product-price, .deal-price',
                code: '.voucher-code, .deal-code',
                image: '.product-image img, .voucher-image img',
                link: 'a[href]',
            }),
            limits: JSON.stringify({
                maxItemsPerPage: 30,
                maxPages: 2,
                requestTimeout: 30000,
            }),
            is_active: true,
            priority: 4,
        },
    ]);
};
