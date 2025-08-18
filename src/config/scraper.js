/**
 * Scraper Configuration
 * Production-ready settings for e-commerce platform scraping
 */

const config = {
    // Global scraping settings
    global: {
        refreshInterval: parseInt(process.env.SCRAPE_INTERVAL) || 60000, // 1 minute
        maxConcurrentScrapers: parseInt(process.env.MAX_CONCURRENT_SCRAPERS) || 5,
        defaultTimeout: parseInt(process.env.SCRAPE_TIMEOUT) || 30000,
        maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
        delayBetweenRequests: parseInt(process.env.DELAY_BETWEEN_REQUESTS) || 2000,
        userAgentRotation: process.env.USER_AGENT_ROTATION === 'true',
        proxyRotation: process.env.PROXY_ROTATION === 'true',
    },

    // Browser settings
    browser: {
        headless: process.env.BROWSER_HEADLESS !== 'false',
        timeout: 30000,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--single-process',
        ],
    },

    // Platform-specific configurations
    platforms: {
        shopee: {
            name: 'Shopee',
            slug: 'shopee',
            enabled: process.env.SHOPEE_ENABLED !== 'false',
            baseUrl: 'https://shopee.co.id',
            endpoints: {
                flashSale: '/flash_sale',
                dailyDiscover: '/daily-discover',
                brands: '/brands',
                vouchers: '/voucher-deals',
            },
            selectors: {
                couponContainer: '[data-sqe="link"], .flash-sale-item, .voucher-card',
                title: '.flash-sale-item-card__title, .voucher-title, .product-title',
                discount: '.flash-sale-item-card__discount, .voucher-discount, .discount-label',
                price: '.flash-sale-item-card__price, .voucher-value, .price',
                code: '.voucher-code, .coupon-code',
                image: 'img[src], img[data-src]',
                link: 'a[href]',
            },
            limits: {
                maxItemsPerPage: 50,
                maxPages: 3,
                requestTimeout: 25000,
            },
        },

        tokopedia: {
            name: 'Tokopedia',
            slug: 'tokopedia',
            enabled: process.env.TOKOPEDIA_ENABLED !== 'false',
            baseUrl: 'https://www.tokopedia.com',
            endpoints: {
                promo: '/promo',
                flashSale: '/flash-sale',
                deals: '/deals',
                vouchers: '/voucher',
            },
            selectors: {
                couponContainer: '[data-testid="divPromoCard"], [data-testid="divProductWrapper"]',
                title: '[data-testid="spnPromoName"], [data-testid="spnProductName"]',
                discount: '[data-testid="spnPromoDiscount"], [data-testid="spnProductDiscount"]',
                price: '[data-testid="spnPromoPrice"], [data-testid="spnProductPrice"]',
                code: '[data-testid="spnPromoCode"]',
                image: '[data-testid="imgPromo"], [data-testid="imgProduct"]',
                link: 'a[href]',
            },
            limits: {
                maxItemsPerPage: 40,
                maxPages: 3,
                requestTimeout: 30000,
            },
        },

        lazada: {
            name: 'Lazada',
            slug: 'lazada',
            enabled: process.env.LAZADA_ENABLED !== 'false',
            baseUrl: 'https://www.lazada.co.id',
            endpoints: {
                flashSale: '/flash-sale',
                vouchers: '/vouchers',
                brands: '/brands',
                deals: '/deals',
            },
            selectors: {
                couponContainer: '.sale-item, .voucher-item, .deal-card',
                title: '.item-title-text, .voucher-title, .deal-title',
                discount: '.sale-percent, .voucher-value, .deal-discount',
                price: '.sale-price, .deal-price',
                code: '.voucher-code, .deal-code',
                image: '.item-img img, .voucher-img img',
                link: 'a[href]',
            },
            limits: {
                maxItemsPerPage: 35,
                maxPages: 2,
                requestTimeout: 35000,
            },
        },

        blibli: {
            name: 'Blibli',
            slug: 'blibli',
            enabled: process.env.BLIBLI_ENABLED !== 'false',
            baseUrl: 'https://www.blibli.com',
            endpoints: {
                deals: '/deals',
                flashSale: '/flash-sale',
                vouchers: '/voucher',
            },
            selectors: {
                couponContainer: '.product-item, .voucher-card, .deal-item',
                title: '.product-title, .voucher-title, .deal-title',
                discount: '.product-discount, .voucher-discount, .deal-discount',
                price: '.product-price, .deal-price',
                code: '.voucher-code, .deal-code',
                image: '.product-image img, .voucher-image img',
                link: 'a[href]',
            },
            limits: {
                maxItemsPerPage: 30,
                maxPages: 2,
                requestTimeout: 30000,
            },
        },
    },

    // User agents for rotation
    userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    ],
};

export default config;
