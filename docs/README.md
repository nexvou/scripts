# 📚 Kupon.id Scraper Documentation

Dokumentasi lengkap untuk sistem scraper Kupon.id yang powerful dan terstruktur.

## 📋 Daftar Isi

- [Architecture Overview](./ARCHITECTURE.md)
- [Core Components](./CORE.md)
- [Scrapers](./SCRAPERS.md)
- [Configuration](./CONFIGURATION.md)
- [Database Integration](./DATABASE.md)
- [Deployment](./DEPLOYMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
- [API Reference](./API.md)

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Test System

```bash
npm test
```

### 4. Run Demo

```bash
npm run demo
```

### 5. Start Scraping

```bash
npm run scrape
```

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ScraperManager│────│  BrowserManager │────│  DatabaseManager│
│                 │    │                 │    │                 │
│ - Orchestration │    │ - Puppeteer     │    │ - Supabase      │
│ - Scheduling    │    │ - Anti-bot      │    │ - Batch saves   │
│ - Rate limiting │    │ - User agents   │    │ - Caching       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Platform Scrapers                           │
├─────────────┬─────────────┬─────────────┬─────────────────────┤
│   Shopee    │  Tokopedia  │   Lazada    │  Blibli/Traveloka   │
│             │             │             │       /Grab         │
│ - Flash Sale│ - Promos    │ - Vouchers  │ - Deals             │
│ - Deals     │ - Cashback  │ - Flash Sale│ - Travel/Food       │
└─────────────┴─────────────┴─────────────┴─────────────────────┘
```

## 🔧 Core Features

### Multi-Platform Support

- **Shopee**: Flash sales, daily discover, brand promotions
- **Tokopedia**: Promo pages, flash sales, cashback offers
- **Lazada**: Flash sales, vouchers, free shipping deals
- **Blibli**: Product deals, voucher scraping
- **Traveloka**: Travel promotions, flight/hotel deals
- **Grab**: Food delivery promos, mart discounts

### Advanced Capabilities

- **Rate Limiting**: Platform-specific intelligent rate limiting
- **Anti-Bot Protection**: User agent rotation, Cloudflare bypass
- **Error Handling**: Retry mechanisms, graceful degradation
- **Scheduling**: Cron-based automated scraping
- **Database Integration**: Batch processing, duplicate handling
- **Logging**: Comprehensive logging with color coding

## 📊 Data Flow

```
1. ScraperManager → Initialize scrapers for enabled platforms
2. RateLimiter → Check and enforce rate limits
3. BrowserManager → Launch browser with anti-bot measures
4. Platform Scraper → Navigate and extract data
5. Data Processing → Clean and structure extracted data
6. DatabaseManager → Batch save to Supabase
7. Cleanup → Remove expired coupons, update stats
```

## 🛠️ Configuration

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key

# Scraper Settings
SCRAPER_HEADLESS=true
SCRAPER_TIMEOUT=30000
SCRAPER_MAX_ITEMS=50
```

### Platform Configuration

Each platform can be configured in `config/scraper.config.js`:

- URLs to scrape
- CSS selectors for data extraction
- Rate limits and timeouts
- Maximum items per scrape

## 📈 Performance

### Optimization Features

- **Batch Processing**: Save multiple items in single database call
- **Resource Blocking**: Block unnecessary CSS/images for faster loading
- **Intelligent Scrolling**: Load dynamic content efficiently
- **Caching**: Merchant ID caching to reduce database queries
- **Parallel Processing**: Multiple scrapers can run simultaneously

### Monitoring

- Real-time logging with timestamps
- Success/failure tracking per platform
- Performance metrics and statistics
- Error reporting and debugging info

## 🔒 Security

### Anti-Detection Measures

- Random user agent rotation
- Request timing randomization
- Cloudflare bypass capabilities
- CAPTCHA detection and handling

### Data Protection

- Environment variable security
- Service role key usage for database
- Input validation and sanitization
- Error message sanitization

## 🚀 Deployment

### Production Setup

1. Set `NODE_ENV=production`
2. Configure Supabase credentials
3. Set up process manager (PM2)
4. Configure monitoring and alerts
5. Set up log rotation

### Scaling Considerations

- Database connection pooling
- Rate limit adjustments
- Memory usage monitoring
- Browser instance management

## 📞 Support

For detailed documentation on specific components, see the individual documentation files in this directory.

For issues and questions:

- Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Review [API Reference](./API.md)
- Open GitHub issue for bugs
- Contact development team for support
