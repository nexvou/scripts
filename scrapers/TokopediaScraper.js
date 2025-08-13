const BaseScraper = require('./BaseScraper');

class TokopediaScraper extends BaseScraper {
    async scrapePage(url, pageType) {
        const page = await this.browser.createPage({ loadImages: false });

        try {
            await this.browser.navigateWithRetry(page, url, {
                timeout: this.config.limits.timeout,
                waitUntil: 'networkidle2',
            });

            await this.delay(4000);
            await this.browser.scrollPage(page, { maxScrolls: 4, delay: 1500 });

            const selectors = this.config.selectors[pageType];
            if (!selectors) {
                throw new Error(`No selectors defined for page type: ${pageType}`);
            }

            const items = await this.extractTokopediaItems(page, selectors);
            this.logger.info(`📦 Extracted ${items.length} items from Tokopedia ${pageType}`);
            return items;
        } catch (error) {
            this.logger.error(`Error scraping Tokopedia ${pageType}:`, error);
            return [];
        } finally {
            await page.close();
        }
    }

    async extractTokopediaItems(page, selectors) {
        return await page.evaluate(sel => {
            const items = [];
            const containerSelectors = [
                sel.container,
                '[data-testid="divPromoCard"]',
                '[data-testid="divProductWrapper"]',
                '.css-1sn1xa2',
            ];

            let containers = [];
            for (const selector of containerSelectors) {
                containers = document.querySelectorAll(selector);
                if (containers.length > 0) break;
            }

            containers.forEach((container, index) => {
                if (index >= 40) return;

                try {
                    const item = {};

                    // Extract title
                    const titleSelectors = [
                        sel.title,
                        '[data-testid="spnPromoName"]',
                        '[data-testid="spnProductName"]',
                    ];
                    for (const titleSel of titleSelectors) {
                        const titleEl = container.querySelector(titleSel);
                        if (titleEl?.textContent?.trim()) {
                            item.title = titleEl.textContent.trim();
                            break;
                        }
                    }

                    // Extract other fields
                    const descEl = container.querySelector(sel.description || '[data-testid="spnPromoDesc"]');
                    if (descEl) item.description = descEl.textContent.trim();

                    const priceEl = container.querySelector(sel.price || '[data-testid="spnProductPrice"]');
                    if (priceEl) item.price = priceEl.textContent.trim();

                    const discountEl = container.querySelector(sel.discount || '[data-testid="spnPromoDiscount"]');
                    if (discountEl) item.discount = discountEl.textContent.trim();

                    const imgEl = container.querySelector(sel.image || '[data-testid="imgPromo"]');
                    if (imgEl) item.image = imgEl.src || imgEl.getAttribute('data-src');

                    const linkEl = container.querySelector('a') || container.closest('a');
                    if (linkEl?.href) {
                        item.link = linkEl.href.startsWith('http')
                            ? linkEl.href
                            : `https://www.tokopedia.com${linkEl.href}`;
                    }

                    if (item.title) items.push(item);
                } catch (error) {
                    console.error('Error extracting Tokopedia item:', error);
                }
            });

            return items;
        }, selectors);
    }

    processItem(item) {
        try {
            const title = item.title
                .replace(/\[FLASH SALE\]/gi, '')
                .replace(/\[PROMO\]/gi, '')
                .trim();
            const { discountValue, discountType } = this.parseDiscount(item.discount);

            const description = item.description || `${title} - Promo eksklusif dari Tokopedia!`;
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 7);

            return {
                title: title.substring(0, 200),
                description: description.substring(0, 500),
                discount_type: discountType,
                discount_value: discountValue,
                merchant_id: this.merchantId,
                source_url: item.link || 'https://www.tokopedia.com',
                image_url: item.image,
                status: 'active',
                is_featured: Math.random() > 0.85,
                valid_until: validUntil.toISOString(),
                scraped_at: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error('Error processing Tokopedia item:', error);
            return null;
        }
    }
}

module.exports = TokopediaScraper;
