# 🕷️ Platform Scrapers Documentation

Dokumentasi lengkap untuk semua platform scraper yang didukung sistem Kupon.id.

## 📋 Daftar Isi

- [BaseScraper](#basescraper)
- [ShopeeScraper](#shopeescraper)
- [TokopediaScraper](#tokopediascraper)
- [LazadaScraper](#lazadascraper)
- [BlibliScraper](#blibliscraper)
- [TravelokaScraper](#travelokascraper)
- [GrabScraper](#grabscraper)

## BaseScraper

**File**: `scrapers/BaseScraper.js`

Kelas dasar yang diextend oleh semua platform scraper.

### Fungsi Utama

#### `constructor(config, db, browser)`

Inisialisasi scraper dengan konfigurasi, database, dan browser manager.

#### `initialize()`

Inisialisasi merchant ID dari database.

#### `scrape()`

Fungsi utama untuk scraping semua halaman platform.

```javascript
const result = await scraper.scrape();
// Returns: { platform, found, saved, errors, items }
```

#### `scrapePage(url, pageType)`

Scraping satu halaman tertentu.

#### `extractItems(page, selectors)`

Ekstraksi data dari halaman menggunakan CSS selectors.

#### `processItems(items)`

Memproses array items mentah menjadi format database.

#### `processItem(item)`

Memproses satu item mentah menjadi format database.

#### `parseDiscount(discountText)`

Parsing teks diskon menjadi nilai dan tipe diskon.

### Template Method Pattern

BaseScraper menggunakan template method pattern dimana:

- `scrape()` adalah template method
- `scrapePage()` bisa di-override untuk handling khusus
- `processItem()` bisa di-override untuk processing khusus

---

## ShopeeScraper

**File**: `scrapers/ShopeeScraper.js`

Scraper khusus untuk platform Shopee.

### Target URLs

- **Flash Sale**: `https://shopee.co.id/flash_sale`
- **Daily Discover**: `https://shopee.co.id/daily-discover`
- **Brands**: `https://shopee.co.id/brands`

### Fitur Khusus

#### Dynamic Content Handling

Shopee menggunakan banyak konten dinamis yang dimuat dengan JavaScript.

```javascript
// Wait for dynamic content
await this.delay(5000);

// Handle lazy loading with scrolling
await this.browser.scrollPage(page, {
    maxScrolls: 3,
    delay: 2000,
});
```

#### Multiple Selector Fallbacks

Menggunakan multiple selector untuk menangani perubahan layout.

```javascript
const containerSelectors = [sel.container, '.shopee-search-item-result', '[data-sqe="link"]', '.flash-sale-item'];
```

#### Shopee-Specific Processing

- Membersihkan title dari bracket `[PROMO]`
- Parsing format diskon Shopee
- Handling URL relatif menjadi absolut

### Data yang Diekstrak

- **Title**: Nama produk/promo
- **Price**: Harga saat ini
- **Discount**: Persentase atau nilai diskon
- **Image**: URL gambar produk
- **Link**: URL ke halaman produk

---

## TokopediaScraper

**File**: `scrapers/TokopediaScraper.js`

Scraper khusus untuk platform Tokopedia.

### Target URLs

- **Promo**: `https://www.tokopedia.com/promo`
- **Flash Sale**: `https://www.tokopedia.com/flash-sale`
- **Deals**: `https://www.tokopedia.com/deals`

### Fitur Khusus

#### Tokopedia-Specific Headers

```javascript
await page.setExtraHTTPHeaders({
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
});
```

#### Data-Testid Selectors

Tokopedia menggunakan `data-testid` attributes yang lebih stabil.

```javascript
const titleSelectors = ['[data-testid="spnPromoName"]', '[data-testid="spnProductName"]', '.prd_link-product-name'];
```

#### Cashback Detection

Khusus mendeteksi dan parsing format cashback Tokopedia.

```javascript
const cashbackMatch = discountText.match(/cashback.*?Rp\s*([\d.,]+)/i);
if (cashbackMatch) {
    return {
        discountValue: parseInt(cashbackMatch[1].replace(/[.,]/g, '')),
        discountType: 'cashback',
    };
}
```

---

## LazadaScraper

**File**: `scrapers/LazadaScraper.js`

Scraper khusus untuk platform Lazada.

### Target URLs

- **Flash Sale**: `https://www.lazada.co.id/flash-sale/`
- **Vouchers**: `https://www.lazada.co.id/vouchers/`
- **Brands**: `https://www.lazada.co.id/brands/`

### Fitur Khusus

#### Anti-Bot Handling

Lazada memiliki proteksi anti-bot yang kuat.

```javascript
// Handle Lazada's anti-bot measures
await this.browser.handleAntiBot(page);
await this.delay(5000);
```

#### Voucher Code Extraction

Khusus untuk halaman voucher, mengekstrak kode voucher.

```javascript
const codeSelectors = [sel.code, '.voucher-code', '.coupon-code'];
```

#### Free Shipping Detection

Mendeteksi promo gratis ongkir.

```javascript
if (discountText.toLowerCase().includes('free shipping') || discountText.toLowerCase().includes('gratis ongkir')) {
    return {
        discountValue: 100,
        discountType: 'shipping',
    };
}
```

---

## BlibliScraper

**File**: `scrapers/BlibliScraper.js`

Scraper khusus untuk platform Blibli.

### Target URLs

- **Deals**: `https://www.blibli.com/deals`
- **Flash Sale**: `https://www.blibli.com/flash-sale`
- **Vouchers**: `https://www.blibli.com/voucher`

### Fitur Khusus

#### Simple and Clean Extraction

Blibli memiliki struktur yang relatif sederhana dan stabil.

#### Product and Voucher Support

Mendukung ekstraksi produk deals dan voucher codes.

---

## TravelokaScraper

**File**: `scrapers/TravelokaScraper.js`

Scraper khusus untuk platform Traveloka.

### Target URLs

- **Deals**: `https://www.traveloka.com/id-id/promotion`
- **Flights**: `https://www.traveloka.com/id-id/flight/promo`
- **Hotels**: `https://www.traveloka.com/id-id/hotel/promo`

### Fitur Khusus

#### Extended Validity Period

Promo travel biasanya berlaku lebih lama.

```javascript
const validUntil = new Date();
validUntil.setDate(validUntil.getDate() + 14); // 14 days
```

#### Travel-Specific Processing

Fokus pada promo travel, hotel, dan penerbangan.

---

## GrabScraper

**File**: `scrapers/GrabScraper.js`

Scraper khusus untuk platform Grab.

### Target URLs

- **Food**: `https://food.grab.com/id/id/promos`
- **Mart**: `https://mart.grab.com/id/promos`

### Fitur Khusus

#### Short-Term Deals

Promo Grab biasanya berlaku singkat.

```javascript
const validUntil = new Date();
validUntil.setDate(validUntil.getDate() + 3); // 3 days
```

#### Food and Mart Focus

Fokus pada promo makanan dan belanja mart.

---

## 🔧 Membuat Scraper Baru

### 1. Extend BaseScraper

```javascript
const BaseScraper = require('./BaseScraper');

class NewPlatformScraper extends BaseScraper {
    // Override methods as needed
}

module.exports = NewPlatformScraper;
```

### 2. Override Methods (Optional)

#### `scrapePage(url, pageType)`

Untuk handling khusus navigasi dan ekstraksi.

#### `processItem(item)`

Untuk processing data khusus platform.

#### `parseDiscount(discountText)`

Untuk parsing format diskon khusus.

### 3. Tambahkan ke Index

```javascript
// scrapers/index.js
module.exports = {
    // existing scrapers...
    newplatform: require('./NewPlatformScraper'),
};
```

### 4. Konfigurasi Platform

```javascript
// config/scraper.config.js
platforms: {
  newplatform: {
    name: 'New Platform',
    slug: 'newplatform',
    enabled: true,
    urls: {
      deals: 'https://newplatform.com/deals'
    },
    selectors: {
      deals: {
        container: '.deal-item',
        title: '.deal-title',
        // ...
      }
    },
    limits: {
      maxItems: 30,
      timeout: 30000
    }
  }
}
```

## 📊 Data Structure

### Input (Raw Item)

```javascript
{
  title: "Product Title",
  description: "Product description",
  price: "Rp 100.000",
  discount: "25% OFF",
  code: "PROMO123",
  image: "https://image.url",
  link: "https://product.url"
}
```

### Output (Processed Item)

```javascript
{
  title: "Product Title",
  description: "Product description - Promo from Platform",
  discount_type: "percentage",
  discount_value: 25,
  coupon_code: "PROMO123",
  merchant_id: 1,
  source_url: "https://product.url",
  image_url: "https://image.url",
  status: "active",
  is_featured: false,
  valid_until: "2024-02-15T00:00:00Z",
  scraped_at: "2024-02-08T10:30:00Z"
}
```

## 🛠️ Best Practices

### Selector Strategy

1. Gunakan multiple fallback selectors
2. Prioritaskan selector yang stabil (data-testid, id)
3. Hindari selector yang terlalu spesifik

### Error Handling

1. Wrap extraction dalam try-catch
2. Log error dengan context yang jelas
3. Return empty array jika scraping gagal

### Performance

1. Block resource yang tidak perlu
2. Gunakan delay yang wajar
3. Limit jumlah item per scrape

### Anti-Detection

1. Gunakan random delays
2. Rotate user agents
3. Handle anti-bot protection
4. Respect rate limits
