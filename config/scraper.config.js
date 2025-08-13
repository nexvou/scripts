module.exports = {
    // Global settings
    delays: {
        betweenPlatforms: 5000,
        betweenRequests: 2000,
        pageLoad: 3000,
    },

    // Cron schedules
    schedule: {
        main: '*/15 * * * *', // Every 15 minutes
        cleanup: '0 * * * *', // Every hour
        stats: '*/30 * * * *', // Every 30 minutes
    },

    // Platform configurations
    platforms: {
        shopee: {
            name: 'Shopee',
            slug: 'shopee',
            enabled: true,
            urls: {
                flashSale: 'https://shopee.co.id/flash_sale',
                dailyDiscover: 'https://shopee.co.id/daily-discover',
                brands: 'https://shopee.co.id/brands',
            },
            selectors: {
                flashSale: {
                    container: '[data-sqe="link"] .stardust-card',
                    title: '.flash-sale-item-card__title',
                    price: '.flash-sale-item-card__price',
                    originalPrice: '.flash-sale-item-card__original-price',
                    discount: '.flash-sale-item-card__discount',
                    image: '.flash-sale-item-card__image img',
                    link: 'a',
                },
                dailyDiscover: {
                    container: '[data-sqe="link"]',
                    title: '.shopee-search-item-result__text',
                    price: '.shopee-price',
                    discount: '.percent-discount',
                    image: '.shopee-search-item-result__image img',
                    link: 'a',
                },
            },
            limits: {
                maxItems: 50,
                timeout: 30000,
            },
        },

        tokopedia: {
            name: 'Tokopedia',
            slug: 'tokopedia',
            enabled: true,
            urls: {
                promo: 'https://www.tokopedia.com/promo',
                flashSale: 'https://www.tokopedia.com/flash-sale',
                deals: 'https://www.tokopedia.com/deals',
            },
            selectors: {
                promo: {
                    container: '[data-testid="divPromoCard"]',
                    title: '[data-testid="spnPromoName"]',
                    description: '[data-testid="spnPromoDesc"]',
                    discount: '[data-testid="spnPromoDiscount"]',
                    image: '[data-testid="imgPromo"]',
                    link: 'a',
                },
                flashSale: {
                    container: '[data-testid="divProductWrapper"]',
                    title: '[data-testid="spnProductName"]',
                    price: '[data-testid="spnProductPrice"]',
                    discount: '[data-testid="spnProductDiscount"]',
                    image: '[data-testid="imgProduct"]',
                    link: 'a',
                },
            },
            limits: {
                maxItems: 40,
                timeout: 35000,
            },
        },

        lazada: {
            name: 'Lazada',
            slug: 'lazada',
            enabled: true,
            urls: {
                flashSale: 'https://www.lazada.co.id/flash-sale/',
                vouchers: 'https://www.lazada.co.id/vouchers/',
                brands: 'https://www.lazada.co.id/brands/',
            },
            selectors: {
                flashSale: {
                    container: '.sale-item',
                    title: '.item-title-text',
                    price: '.sale-price',
                    originalPrice: '.origin-price',
                    discount: '.sale-percent',
                    image: '.item-img img',
                    link: 'a',
                },
                vouchers: {
                    container: '.voucher-item',
                    title: '.voucher-title',
                    description: '.voucher-desc',
                    discount: '.voucher-value',
                    code: '.voucher-code',
                    link: 'a',
                },
            },
            limits: {
                maxItems: 35,
                timeout: 40000,
            },
        },

        blibli: {
            name: 'Blibli',
            slug: 'blibli',
            enabled: true,
            urls: {
                deals: 'https://www.blibli.com/deals',
                flashSale: 'https://www.blibli.com/flash-sale',
                vouchers: 'https://www.blibli.com/voucher',
            },
            selectors: {
                deals: {
                    container: '.product-item',
                    title: '.product-title',
                    price: '.product-price',
                    discount: '.product-discount',
                    image: '.product-image img',
                    link: 'a',
                },
                vouchers: {
                    container: '.voucher-card',
                    title: '.voucher-title',
                    description: '.voucher-description',
                    discount: '.voucher-discount',
                    code: '.voucher-code',
                    link: 'a',
                },
            },
            limits: {
                maxItems: 30,
                timeout: 30000,
            },
        },

        traveloka: {
            name: 'Traveloka',
            slug: 'traveloka',
            enabled: true,
            urls: {
                deals: 'https://www.traveloka.com/id-id/promotion',
                flights: 'https://www.traveloka.com/id-id/flight/promo',
                hotels: 'https://www.traveloka.com/id-id/hotel/promo',
            },
            selectors: {
                deals: {
                    container: '.promotion-card',
                    title: '.promotion-title',
                    description: '.promotion-description',
                    discount: '.promotion-discount',
                    image: '.promotion-image img',
                    link: 'a',
                },
            },
            limits: {
                maxItems: 25,
                timeout: 35000,
            },
        },

        grab: {
            name: 'Grab',
            slug: 'grab',
            enabled: true,
            urls: {
                food: 'https://food.grab.com/id/id/promos',
                mart: 'https://mart.grab.com/id/promos',
            },
            selectors: {
                food: {
                    container: '.promo-card',
                    title: '.promo-title',
                    description: '.promo-description',
                    discount: '.promo-discount',
                    image: '.promo-image img',
                    link: 'a',
                },
            },
            limits: {
                maxItems: 20,
                timeout: 30000,
            },
        },
    },
};
