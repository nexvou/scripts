const BaseScraper = require('./BaseScraper');

class TravelokaScraper extends BaseScraper {
    async scrapePage(url, pageType) {
        const page = await this.browser.createPage({ loadImages: false });

        try {
            await this.browser.navigateWithRetry(page, url, {
                timeout: this.config.limits.timeout,
                waitUntil: 'networkidle2',
            });

            await this.delay(4000);
            await this.browser.scrollPage(page, { maxScrolls: 2, delay: 2000 });

            const selectors = this.config.selectors[pageType];
            if (!selectors) {
                throw new Error(`No selectors defined for page type: ${pageType}`);
            }

            const items = await this.extractTravelokaItems(page, selectors);
            this.logger.info(`📦 Extracted ${items.length} items from Traveloka ${pageType}`);
            return items;
        } catch (error) {
            this.logger.error(`Error scraping Traveloka ${pageType}:`, error);
            return [];
        } finally {
            await page.close();
        }
    }

    async extractTravelokaItems(page, selectors) {
        return await page.evaluate(sel => {
            const items = [];
            const containerSelectors = [sel.container, '.promotion-card'];

            let containers = [];
            for (const selector of containerSelectors) {
                containers = document.querySelectorAll(selector);
                if (containers.length > 0) break;
            }

            containers.forEach((container, index) => {
                if (index >= 25) return;

                try {
                    const item = {};

                    const titleEl = container.querySelector(sel.title || '.promotion-title');
                    if (titleEl) item.title = titleEl.textContent.trim();

                    const descEl = container.querySelector(sel.description || '.promotion-description');
                    if (descEl) item.description = descEl.textContent.trim();

                    const discountEl = container.querySelector(sel.discount || '.promotion-discount');
                    if (discountEl) item.discount = discountEl.textContent.trim();

                    const imgEl = container.querySelector(sel.image || '.promotion-image img');
                    if (imgEl) item.image = imgEl.src || imgEl.getAttribute('data-src');

                    const linkEl = container.querySelector('a') || container.closest('a');
                    if (linkEl?.href) {
                        item.link = linkEl.href.startsWith('http')
                            ? linkEl.href
                            : `https://www.traveloka.com${linkEl.href}`;
                    }

                    if (item.title) items.push(item);
                } catch (error) {
                    console.error('Error extracting Traveloka item:', error);
                }
            });

            return items;
        }, selectors);
    }

    processItem(item) {
        try {
            const title = item.title.trim();
            const { discountValue, discountType } = this.parseDiscount(item.discount);

            const description = item.description || `${title} - Promo travel terbaik dari Traveloka!`;
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + 14); // Travel promos usually longer

            return {
                title: title.substring(0, 200),
                description: description.substring(0, 500),
                discount_type: discountType,
                discount_value: discountValue,
                merchant_id: this.merchantId,
                source_url: item.link || 'https://www.traveloka.com',
                image_url: item.image,
                status: 'active',
                is_featured: Math.random() > 0.8,
                valid_until: validUntil.toISOString(),
                scraped_at: new Date().toISOString(),
            };
        } catch (error) {
            this.logger.error('Error processing Traveloka item:', error);
            return null;
        }
    }
}

module.exports = TravelokaScraper;
