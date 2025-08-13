const BaseScraper = require('./BaseScraper');

class GrabScraper extends BaseScraper {
    async scrapePage(url, pageType) {
        const page = await this.browser.createPage({ loadImages: false });

        try {
            await this.browser.navigateWithRetry(page, url, {
                timeout: this.config.limits.timeout,
                waitUntil: 'networkidle2',
            });

            await this.delay(3000);
            await this.browser.scrollPage(page, { maxScrolls: 2, delay: 1500 });

            const selectors = this.config.selectors[pageType];
            if (!selectors) {
                throw new Error(`No selectors defined for page type: ${pageType}`);
            }

            const items = await this.extractGrabItems(page, selectors);
            this.logger.info(`📦 Extracted ${items.length} items from Grab ${pageType}`);
            return items;
        } catch (error) {
            this.logger.error(`Error scraping Grab ${pageType}:`, error);
            return [];
        } finally {
            await page.close();
        }
    }

    async extractGrabItems(page, selectors) {
        return await page.evaluate(sel => {
            const items = [];
            const containerSelectors = [sel.container, '.promo-card'];

            let containers = [];
            for (const selector of containerSelectors) {
                containers = document.querySelectorAll(selector);
                if (containers.length > 0) break;
            }

            containers.forEach((container, index) => {
                if (index >= 20) return;

                try {
                    const item = {};

                    const titleEl = container.querySelector(sel.title || '.promo-title');
                    if (titleEl) item.title = titleEl.textContent.trim();

                    const descEl = container.querySelector(sel.description || '.promo-description');
                    if (descEl) item.description = descEl.textContent.trim();

                    const discountEl = container.querySelector(sel.discount || '.promo-discount');
                    if (discountEl) item.discount = discountEl.textContent.trim();

                    const imgEl = container.querySelector(sel.image || '.promo-image img');
                    if (imgEl) item.image = imgEl.src || imgEl.getAttribute('data-src');

                    const linkEl = container.querySelector('a') || container.closest('a');
                    if (linkEl?.href) {
                        item.link = linkEl.href;
                    }

                    if (item.title) items.push(item);
                } catch (error) {
                    console.error('Error extracting Grab item:', error);
                }
            });

            return items;
        }, selectors);
    }

    processItem(item) {
        try {
            const title = item.title.trim();
            const { discountValue, discountType } = this.parseDiscount(item.discount);

            const description = item.description || `${title} - Promo menarik dari Grab!`;
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 3); // Grab promos usually short-term

            return {
                title: title.substring(0, 200),
                description: description.substring(0, 500),
                discount_type: discountType,
                discount_value: discountValue,
                merchant_id: this.merchantId,
                source_url: item.link || 'https://grab.com',
                image_url: item.image,
                status: 'active',
                is_featured: Math.random() > 0.85,
                valid_until: validUntil.toISOString(),
                scraped_at: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error('Error processing Grab item:', error);
            return null;
        }
    }
}

module.exports = GrabScraper;
