const BaseScraper = require('./BaseScraper');

class ShopeeScraper extends BaseScraper {
    async scrapePage(url, pageType) {
        const page = await this.browser.createPage({ loadImages: false });

        try {
            // Navigate with specific Shopee handling
            await this.browser.navigateWithRetry(page, url, {
                timeout: this.config.limits.timeout,
                waitUntil: 'networkidle0',
            });

            // Wait for Shopee's dynamic content to load
            await this.delay(5000);

            // Handle Shopee's lazy loading
            await this.browser.scrollPage(page, {
                maxScrolls: 3,
                delay: 2000,
            });

            // Wait for items to load after scrolling
            await this.delay(3000);

            const selectors = this.config.selectors[pageType];
            if (!selectors) {
                throw new Error(`No selectors defined for page type: ${pageType}`);
            }

            // Shopee-specific extraction with better error handling
            const items = await page.evaluate(sel => {
                const items = [];

                // Try multiple possible container selectors
                const containerSelectors = [
                    sel.container,
                    '.shopee-search-item-result',
                    '[data-sqe="link"]',
                    '.flash-sale-item',
                ];

                let containers = [];
                for (const selector of containerSelectors) {
                    containers = document.querySelectorAll(selector);
                    if (containers.length > 0) break;
                }

                containers.forEach((container, index) => {
                    if (index >= 50) return; // Limit items

                    try {
                        const item = {};

                        // Extract title with multiple fallbacks
                        const titleSelectors = [
                            sel.title,
                            '.shopee-search-item-result__text',
                            '.flash-sale-item-card__title',
                            '[data-testid="title"]',
                            '.item-name',
                        ];

                        for (const titleSel of titleSelectors) {
                            const titleEl = container.querySelector(titleSel);
                            if (titleEl?.textContent?.trim()) {
                                item.title = titleEl.textContent.trim();
                                break;
                            }
                        }

                        // Extract price
                        const priceSelectors = [
                            sel.price,
                            '.shopee-price',
                            '.flash-sale-item-card__price',
                            '[data-testid="price"]',
                        ];

                        for (const priceSel of priceSelectors) {
                            const priceEl = container.querySelector(priceSel);
                            if (priceEl?.textContent?.trim()) {
                                item.price = priceEl.textContent.trim();
                                break;
                            }
                        }

                        // Extract discount
                        const discountSelectors = [
                            sel.discount,
                            '.percent-discount',
                            '.flash-sale-item-card__discount',
                            '[data-testid="discount"]',
                        ];

                        for (const discountSel of discountSelectors) {
                            const discountEl = container.querySelector(discountSel);
                            if (discountEl?.textContent?.trim()) {
                                item.discount = discountEl.textContent.trim();
                                break;
                            }
                        }

                        // Extract image
                        const imgSelectors = [
                            sel.image,
                            '.shopee-search-item-result__image img',
                            '.flash-sale-item-card__image img',
                            'img',
                        ];

                        for (const imgSel of imgSelectors) {
                            const imgEl = container.querySelector(imgSel);
                            if (imgEl) {
                                item.image =
                                    imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original');
                                if (item.image) break;
                            }
                        }

                        // Extract link
                        const linkEl = container.querySelector('a') || container.closest('a');
                        if (linkEl?.href) {
                            item.link = linkEl.href.startsWith('http')
                                ? linkEl.href
                                : `https://shopee.co.id${linkEl.href}`;
                        }

                        // Only add if we have essential data
                        if (item.title && (item.price || item.discount)) {
                            items.push(item);
                        }
                    } catch (error) {
                        console.error('Error extracting Shopee item:', error);
                    }
                });

                return items;
            }, selectors);

            this.logger.info(`📦 Extracted ${items.length} items from Shopee ${pageType}`);
            return items;
        } catch (error) {
            this.logger.error(`Error scraping Shopee ${pageType}:`, error);
            return [];
        } finally {
            await page.close();
        }
    }

    processItem(item) {
        try {
            // Shopee-specific processing
            let title = item.title;

            // Clean up Shopee title
            title = title.replace(/\[.*?\]/g, '').trim(); // Remove brackets
            title = title.replace(/\s+/g, ' '); // Normalize spaces

            // Parse Shopee discount format
            const { discountValue, discountType } = this.parseShopeeDiscount(item.discount, item.price);

            // Generate description
            const description = `${title} - Penawaran spesial dari Shopee dengan diskon menarik!`;

            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 5); // Shopee deals usually shorter

            return {
                title: title.substring(0, 200),
                description: description.substring(0, 500),
                discount_type: discountType,
                discount_value: discountValue,
                merchant_id: this.merchantId,
                source_url: item.link || 'https://shopee.co.id',
                image_url: item.image,
                status: 'active',
                is_featured: Math.random() > 0.8,
                valid_until: validUntil.toISOString(),
                scraped_at: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error('Error processing Shopee item:', error);
            return null;
        }
    }

    parseShopeeDiscount(discountText, priceText) {
        if (!discountText && !priceText) {
            return { discountValue: null, discountType: 'percentage' };
        }

        // Try discount text first
        if (discountText) {
            const percentMatch = discountText.match(/(\d+)%/);
            if (percentMatch) {
                return {
                    discountValue: parseInt(percentMatch[1]),
                    discountType: 'percentage',
                };
            }
        }

        // Try to extract from price comparison
        if (priceText) {
            const priceMatch = priceText.match(/Rp([\d.,]+).*?Rp([\d.,]+)/);
            if (priceMatch) {
                const currentPrice = parseInt(priceMatch[1].replace(/[.,]/g, ''));
                const originalPrice = parseInt(priceMatch[2].replace(/[.,]/g, ''));

                if (originalPrice > currentPrice) {
                    const discount = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
                    return {
                        discountValue: discount,
                        discountType: 'percentage',
                    };
                }
            }
        }

        return { discountValue: null, discountType: 'percentage' };
    }
}

module.exports = ShopeeScraper;
