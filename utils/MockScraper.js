const Logger = require('./Logger');

class MockScraper {
    constructor() {
        this.logger = new Logger('MockScraper');
    }

    async generateMockData(platform, count = 5) {
        this.logger.info(`🎭 Generating ${count} mock items for ${platform}`);

        const mockItems = [];
        const discounts = ['15%', '25%', '35%', '45%', 'Rp 75.000', 'Rp 150.000'];
        const titles = [
            `${platform} Flash Sale Spesial`,
            `Diskon Besar ${platform}`,
            `Promo Eksklusif ${platform}`,
            `${platform} Cashback`,
            `Gratis Ongkir ${platform}`,
            `${platform} Weekend Sale`,
            `Mega Sale ${platform}`,
            `${platform} Special Offer`,
            `Limited Deal ${platform}`,
            `${platform} Hot Deals`,
        ];

        // Platform-specific URLs and images
        const platformData = {
            Shopee: {
                baseUrl: 'https://shopee.co.id',
                imageDomain: 'https://cf.shopee.co.id/file',
                paths: ['/flash-sale', '/daily-discover', '/brands'],
            },
            Tokopedia: {
                baseUrl: 'https://www.tokopedia.com',
                imageDomain: 'https://images.tokopedia.net/img',
                paths: ['/promo', '/flash-sale', '/deals'],
            },
            Lazada: {
                baseUrl: 'https://www.lazada.co.id',
                imageDomain: 'https://id-live-01.slatic.net/p',
                paths: ['/flash-sale', '/vouchers', '/brands'],
            },
            Blibli: {
                baseUrl: 'https://www.blibli.com',
                imageDomain: 'https://www.static-src.com/wcsstore',
                paths: ['/deals', '/flash-sale', '/voucher'],
            },
            Traveloka: {
                baseUrl: 'https://www.traveloka.com',
                imageDomain: 'https://ik.imagekit.io/tvlk',
                paths: ['/id-id/promotion', '/id-id/flight/promo', '/id-id/hotel/promo'],
            },
            Grab: {
                baseUrl: 'https://www.grab.com',
                imageDomain: 'https://d1sag4ddilekf6.cloudfront.net',
                paths: ['/id/food/promos', '/id/mart/promos'],
            },
        };

        const platformInfo = platformData[platform] || {
            baseUrl: `https://www.${platform.toLowerCase()}.com`,
            imageDomain: `https://images.${platform.toLowerCase()}.com`,
            paths: ['/promo', '/deals', '/sale'],
        };

        for (let i = 0; i < count; i++) {
            const randomPath = platformInfo.paths[Math.floor(Math.random() * platformInfo.paths.length)];
            const itemId = Math.floor(Math.random() * 1000000);

            mockItems.push({
                title: `${titles[Math.floor(Math.random() * titles.length)]} ${i + 1}`,
                description: `Promo menarik dari ${platform} dengan berbagai keuntungan`,
                discount: discounts[Math.floor(Math.random() * discounts.length)],
                price: `Rp ${(Math.random() * 1000000 + 50000).toFixed(0)}`,
                image: `${platformInfo.imageDomain}/${itemId}_300x300.jpg`,
                link: `${platformInfo.baseUrl}${randomPath}/${itemId}`,
                code: Math.random() > 0.5 ? `${platform.toUpperCase()}${Math.floor(Math.random() * 1000)}` : null,
            });
        }

        return mockItems;
    }
}

module.exports = MockScraper;
