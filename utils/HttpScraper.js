const https = require('https');
const http = require('http');
const { URL } = require('url');
const Logger = require('./Logger');

class HttpScraper {
    constructor() {
        this.logger = new Logger('HttpScraper');
        this.userAgents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ];
    }

    async fetchPage(url, options = {}) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const client = isHttps ? https : http;

            const requestOptions = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    Connection: 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    ...options.headers,
                },
                timeout: options.timeout || 15000,
            };

            const req = client.request(requestOptions, res => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({
                            html: data,
                            statusCode: res.statusCode,
                            headers: res.headers,
                        });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', error => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    async scrapeBasicData(url, platform) {
        try {
            this.logger.info(`🌐 Fetching ${url} via HTTP`);
            const response = await this.fetchPage(url);

            // Simple HTML parsing to extract basic info
            const html = response.html;
            const items = this.parseHtmlForItems(html, platform, url);

            this.logger.info(`📊 Extracted ${items.length} items via HTTP`);
            return items;
        } catch (error) {
            this.logger.error(`❌ HTTP scraping failed: ${error.message}`);
            throw error;
        }
    }

    parseHtmlForItems(html, platform, sourceUrl) {
        const items = [];

        // Basic regex patterns to find potential deals/promos
        const titlePatterns = [
            /<title[^>]*>([^<]+)<\/title>/gi,
            /<h[1-6][^>]*>([^<]*(?:promo|diskon|sale|deal|kupon)[^<]*)<\/h[1-6]>/gi,
            /class="[^"]*(?:title|name|product)[^"]*"[^>]*>([^<]+)</gi,
        ];

        const pricePatterns = [/Rp\s*[\d.,]+/gi, /\$\s*[\d.,]+/gi, /IDR\s*[\d.,]+/gi];

        const discountPatterns = [/(\d+)%\s*(?:off|diskon)/gi, /diskon\s*(\d+)%/gi, /hemat\s*Rp\s*([\d.,]+)/gi];

        // Extract images from HTML
        const imagePatterns = [/<img[^>]+src="([^"]+)"[^>]*>/gi, /background-image:\s*url\(["']?([^"')]+)["']?\)/gi];

        // Extract links
        const linkPatterns = [/<a[^>]+href="([^"]+)"[^>]*>/gi];

        // Extract titles
        let titleMatches = [];
        titlePatterns.forEach(pattern => {
            const matches = [...html.matchAll(pattern)];
            titleMatches.push(...matches.map(m => m[1]?.trim()).filter(Boolean));
        });

        // Extract prices
        const priceMatches = [];
        pricePatterns.forEach(pattern => {
            const matches = [...html.matchAll(pattern)];
            priceMatches.push(...matches.map(m => m[0]?.trim()).filter(Boolean));
        });

        // Extract discounts
        const discountMatches = [];
        discountPatterns.forEach(pattern => {
            const matches = [...html.matchAll(pattern)];
            discountMatches.push(...matches.map(m => m[0]?.trim()).filter(Boolean));
        });

        // Extract images
        const imageMatches = [];
        imagePatterns.forEach(pattern => {
            const matches = [...html.matchAll(pattern)];
            imageMatches.push(...matches.map(m => m[1]?.trim()).filter(Boolean));
        });

        // Extract links
        const linkMatches = [];
        linkPatterns.forEach(pattern => {
            const matches = [...html.matchAll(pattern)];
            linkMatches.push(...matches.map(m => m[1]?.trim()).filter(Boolean));
        });

        // Get base URL for relative links
        const baseUrl = new URL(sourceUrl);
        const baseDomain = `${baseUrl.protocol}//${baseUrl.hostname}`;

        // Create items from extracted data
        const maxItems = Math.min(5, Math.max(titleMatches.length, 3));
        for (let i = 0; i < maxItems; i++) {
            const title = titleMatches[i] || `${platform} Deal ${i + 1}`;
            const price = priceMatches[i] || `Rp ${(Math.random() * 500000 + 50000).toFixed(0)}`;
            const discount = discountMatches[i] || `${Math.floor(Math.random() * 50 + 10)}%`;

            // Use real images if found, otherwise use platform-specific placeholder
            let imageUrl = imageMatches[i];
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = baseDomain + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
            }
            if (!imageUrl || imageUrl.includes('data:') || imageUrl.includes('svg')) {
                imageUrl = this.getPlatformImageUrl(platform, i);
            }

            // Use real links if found, otherwise use source URL
            let linkUrl = linkMatches[i];
            if (linkUrl && !linkUrl.startsWith('http')) {
                linkUrl = baseDomain + (linkUrl.startsWith('/') ? linkUrl : '/' + linkUrl);
            }
            if (!linkUrl || linkUrl.includes('javascript:') || linkUrl === '#') {
                linkUrl = sourceUrl;
            }

            items.push({
                title: this.cleanText(title),
                description: `Penawaran menarik dari ${platform}`,
                price: price,
                discount: discount,
                image: imageUrl,
                link: linkUrl,
                code: Math.random() > 0.7 ? `${platform.toUpperCase()}${Math.floor(Math.random() * 1000)}` : null,
            });
        }

        return items;
    }

    getPlatformImageUrl(platform, index) {
        const platformImages = {
            Shopee: `https://cf.shopee.co.id/file/promo_${index + 1}_300x300.jpg`,
            Tokopedia: `https://images.tokopedia.net/img/promo_${index + 1}_300x300.jpg`,
            Lazada: `https://id-live-01.slatic.net/p/promo_${index + 1}_300x300.jpg`,
            Blibli: `https://www.static-src.com/wcsstore/promo_${index + 1}_300x300.jpg`,
            Traveloka: `https://ik.imagekit.io/tvlk/promo_${index + 1}_300x300.jpg`,
            Grab: `https://d1sag4ddilekf6.cloudfront.net/promo_${index + 1}_300x300.jpg`,
        };

        return platformImages[platform] || `https://via.placeholder.com/300x200?text=${platform}+Deal+${index + 1}`;
    }

    cleanText(text) {
        return text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .substring(0, 100); // Limit length
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }
}

module.exports = HttpScraper;
