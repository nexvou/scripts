const BaseScraper = require('./BaseScraper');

class LazadaScraper extends BaseScraper {
    async scrapePage(url, pageType) {
        const page = await this.browser.createPage({ loadImages: false });

        try {
            await this.browser.navigateWithRetry(page, url, {
                timeout: this.config.limits.timeout,
                waitUntil: 'networkidle2',
            });

            await this.browser.handleAntiBot(page);
            await this.delay(5000);
            await this.browser.scrollPage(page, { maxScrolls: 3, delay: 2000 });

            const selectors = this.config.selectors[pageType];
            if (!selectors) {
                throw new Error(`No selectors defined for page type: ${pageType}`);
            }

            const items = await this.extractLazadaItems(page, selectors);
            this.logger.info(`📦 Extracted ${items.length} items from Lazada ${pageType}`);
            return items;
        } catch (error) {
            this.logger.error(`Error scraping Lazada ${pageType}:`, error);
            return [];
        } finally {
            await page.close();
        }
    }

    async extractLazadaItems(page, selectors) {
        return await page.evaluate(sel => {
            const items = [];
            const containerSelectors = [sel.container, '.sale-item', '.voucher-item', '.c2prKC'];

            let containers = [];
            for (const selector of containerSelectors) {
                containers = document.querySelectorAll(selector);
                if (containers.length > 0) break;
            }

            containers.forEach((container, index) => {
                if (index >= 35) return;

                try {
                    const item = {};

                    // Extract fields with fallbacks
                    const titleEl = container.querySelector(sel.title || '.item-title-text');
                    if (titleEl) item.title = titleEl.textContent.trim();

                    const descEl = container.querySelector(sel.description || '.voucher-desc');
                    if (descEl) item.description = descEl.textContent.trim();

                    const priceEl = container.querySelector(sel.price || '.sale-price');
                    if (priceEl) item.price = priceEl.textContent.trim();

                    const discountEl = container.querySelector(sel.discount || '.sale-percent');
                    if (discountEl) item.discount = discountEl.textContent.trim();

                    const codeEl = container.querySelector(sel.code || '.voucher-code');
                    if (codeEl) item.code = codeEl.textContent.trim();

                    const imgEl = container.querySelector(sel.image || '.item-img img');
                    if (imgEl) item.image = imgEl.src || imgEl.getAttribute('data-src');

                    const linkEl = container.querySelector('a') || container.closest('a');
                    if (linkEl?.href) {
                        item.link = linkEl.href.startsWith('http')
                            ? linkEl.href
                            : `https://www.lazada.co.id${linkEl.href}`;
                    }

                    if (item.title) items.push(item);
                } catch (error) {
                    console.error('Error extracting Lazada item:', error);
                }
            });

            return items;
        }, selectors);
    }

    processItem(item) {
        try {
            const title = item.title
                .replace(/\[.*?\]/g, '')
                .replace(/FLASH SALE/gi, '')
                .trim();
            const { discountValue, discountType } = this.parseDiscount(item.discount);

            const description = item.description || `${title} - Penawaran terbatas dari Lazada!`;
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 6);

            return {
                title: title.substring(0, 200),
                description: description.substring(0, 500),
                discount_type: discountType,
                discount_value: discountValue,
                coupon_code: item.code || null,
                merchant_id: this.merchantId,
                source_url: item.link || 'https://www.lazada.co.id',
                image_url: item.image,
                status: 'active',
                is_featured: Math.random() > 0.82,
                valid_until: validUntil.toISOString(),
                scraped_at: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error('Error processing Lazada item:', error);
            return null;
        }
    }
}

module.exports = LazadaScraper;
