# 🔧 Core Components Documentation

Dokumentasi lengkap untuk komponen inti sistem scraper Kupon.id.

## 📋 Daftar Isi

- [ScraperManager](#scrapermanager)
- [DatabaseManager](#databasemanager)
- [BrowserManager](#browsermanager)
- [Logger](#logger)
- [RateLimiter](#ratelimiter)

## ScraperManager

**File**: `core/ScraperManager.js`

Komponen utama yang mengatur dan mengoordinasikan semua scraper platform.

### Fungsi Utama

#### `constructor(config)`

Inisialisasi ScraperManager dengan konfigurasi platform.

```javascript
const manager = new ScraperManager(config);
```

#### `initializeScrapers()`

Menginisialisasi semua scraper platform yang diaktifkan.

#### `runTests()`

Menjalankan tes koneksi untuk database, browser, dan semua scraper.

```javascript
await manager.runTests();
// Output:
// Database: ✅
// Browser: ✅
// shopee: ✅
// tokopedia: ✅
```

#### `scrapePlatform(platform)`

Menjalankan scraper untuk platform tertentu.

```javascript
const result = await manager.scrapePlatform('shopee');
// Returns: { platform, found, saved, errors, items }
```

#### `scrapeAll()`

Menjalankan semua scraper platform secara berurutan.

#### `startScheduler()`

Memulai layanan terjadwal dengan cron jobs.

### Fitur

- **Orchestration**: Mengatur urutan dan timing scraping
- **Error Handling**: Menangani error per platform tanpa menghentikan yang lain
- **Scheduling**: Cron jobs untuk scraping otomatis
- **Rate Limiting**: Integrasi dengan RateLimiter
- **Logging**: Log komprehensif untuk monitoring

---

## DatabaseManager

**File**: `core/DatabaseManager.js`

Mengelola semua operasi database dengan Supabase.

### Fungsi Utama

#### `constructor()`

Inisialisasi koneksi Supabase dan cache merchant.

#### `testConnection()`

Tes koneksi database.

```javascript
const isConnected = await db.testConnection();
```

#### `getMerchantId(slug)`

Mendapatkan ID merchant berdasarkan slug dengan caching.

```javascript
const merchantId = await db.getMerchantId('shopee');
```

#### `saveCoupon(couponData)`

Menyimpan satu kupon ke database.

#### `saveBatch(coupons)`

Menyimpan multiple kupon dalam batch untuk efisiensi.

```javascript
const result = await db.saveBatch(coupons);
// Returns: { saved: 45, errors: 2 }
```

#### `cleanupExpired()`

Menandai kupon yang sudah expired sebagai tidak aktif.

#### `updateStats()`

Memperbarui statistik kupon (view counts, click counts, dll).

### Fitur

- **Batch Processing**: Efisien untuk menyimpan banyak data
- **Caching**: Cache merchant ID untuk mengurangi query
- **Error Handling**: Robust error handling untuk operasi database
- **Upsert Operations**: Menghindari duplikasi data
- **Statistics**: Tracking dan update statistik otomatis

---

## BrowserManager

**File**: `core/BrowserManager.js`

Mengelola browser automation dengan Puppeteer.

### Fungsi Utama

#### `getBrowser()`

Mendapatkan instance browser (singleton pattern).

#### `createPage(options)`

Membuat halaman baru dengan konfigurasi anti-bot.

```javascript
const page = await browser.createPage({
    loadImages: false,
    width: 1366,
    height: 768,
});
```

#### `navigateWithRetry(page, url, options)`

Navigasi dengan retry mechanism.

```javascript
await browser.navigateWithRetry(page, url, {
    timeout: 30000,
    maxRetries: 3,
    waitUntil: 'networkidle2',
});
```

#### `scrollPage(page, options)`

Scroll halaman untuk memuat konten dinamis.

#### `handleAntiBot(page)`

Menangani proteksi anti-bot (Cloudflare, CAPTCHA).

### Fitur

- **Anti-Bot Measures**: User agent rotation, header spoofing
- **Resource Blocking**: Block CSS/images untuk loading lebih cepat
- **Retry Logic**: Automatic retry untuk navigasi yang gagal
- **Cloudflare Bypass**: Menangani proteksi Cloudflare
- **Performance Optimization**: Konfigurasi browser untuk performa optimal

---

## Logger

**File**: `utils/Logger.js`

Sistem logging dengan color coding dan formatting.

### Fungsi Utama

#### `constructor(context)`

Inisialisasi logger dengan context tertentu.

```javascript
const logger = new Logger('ShopeeScraper');
```

#### `info(message, data)`

Log informasi umum.

```javascript
logger.info('Scraping started', { platform: 'shopee' });
```

#### `warn(message, data)`

Log peringatan.

#### `error(message, data)`

Log error.

#### `debug(message, data)`

Log debug (hanya tampil dalam development mode).

#### `success(message, data)`

Log sukses dengan highlight.

### Fitur

- **Color Coding**: Warna berbeda untuk setiap level log
- **Timestamps**: Timestamp ISO untuk setiap log entry
- **Context**: Menampilkan context (nama scraper/component)
- **Data Logging**: Support untuk log data tambahan dalam JSON
- **Environment Aware**: Debug logs hanya tampil dalam development

---

## RateLimiter

**File**: `utils/RateLimiter.js`

Mengatur rate limiting per platform untuk menghindari blocking.

### Fungsi Utama

#### `wait(platform)`

Menunggu jika rate limit tercapai.

```javascript
await rateLimiter.wait('shopee');
// Will wait if rate limit exceeded
```

#### `getStatus(platform)`

Mendapatkan status rate limit untuk platform.

```javascript
const status = rateLimiter.getStatus('shopee');
// Returns: { platform, requests, limit, window, remaining }
```

### Konfigurasi Rate Limits

```javascript
const limits = {
    shopee: { requests: 10, window: 60000 }, // 10 req/min
    tokopedia: { requests: 15, window: 60000 }, // 15 req/min
    lazada: { requests: 12, window: 60000 }, // 12 req/min
    // ...
};
```

### Fitur

- **Platform-Specific**: Rate limit berbeda per platform
- **Sliding Window**: Menggunakan sliding window algorithm
- **Automatic Waiting**: Otomatis menunggu jika limit tercapai
- **Status Monitoring**: Monitoring status rate limit real-time

## 🔄 Integrasi Antar Komponen

```
ScraperManager
├── DatabaseManager (untuk save data)
├── BrowserManager (untuk web scraping)
├── RateLimiter (untuk rate limiting)
└── Logger (untuk logging)

Platform Scrapers
├── DatabaseManager (untuk save data)
├── BrowserManager (untuk browser operations)
└── Logger (untuk logging)
```

## 📊 Flow Eksekusi

1. **Initialization**: ScraperManager menginisialisasi semua komponen
2. **Rate Check**: RateLimiter mengecek apakah bisa melakukan request
3. **Browser Setup**: BrowserManager menyiapkan browser dan page
4. **Data Extraction**: Platform scraper mengekstrak data
5. **Data Processing**: Data diproses dan dibersihkan
6. **Database Save**: DatabaseManager menyimpan data dalam batch
7. **Cleanup**: Cleanup expired data dan update statistics
8. **Logging**: Semua aktivitas dicatat oleh Logger

## 🛠️ Best Practices

### Error Handling

- Selalu gunakan try-catch untuk operasi async
- Log error dengan context yang jelas
- Implementasi graceful degradation

### Performance

- Gunakan batch operations untuk database
- Block resource yang tidak perlu di browser
- Implementasi caching untuk data yang sering diakses

### Monitoring

- Log semua operasi penting
- Monitor rate limit status
- Track success/failure rates per platform
