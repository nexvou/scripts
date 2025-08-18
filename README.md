# 🛒 E-Commerce Coupon Scraper

A powerful, scalable, and production-ready coupon scraping system for major e-commerce platforms in Indonesia.

## 🚀 Features

- **Multi-Platform Support**: Shopee, Tokopedia, Lazada, Blibli, Traveloka, Grab
- **Real-Time Data**: 100% valid coupon data scraped in real-time
- **Multiple Database Support**: MySQL, PostgreSQL, SQLite, Supabase
- **Auto-Refresh**: Data refreshes every 1 minute
- **Vercel Ready**: Optimized for serverless deployment
- **Scalable Architecture**: Clean, modular, and easy to extend
- **Production Grade**: Error handling, logging, monitoring

## 📁 Project Structure

```
├── src/
│   ├── config/           # Configuration files
│   ├── database/         # Database adapters and migrations
│   ├── scrapers/         # Platform-specific scrapers
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript definitions
├── api/                  # Vercel API endpoints
├── migrations/           # Database migrations
├── tests/               # Test files
└── docs/                # Documentation
```

## 🛠️ Tech Stack

- **Runtime**: Node.js with Bun
- **Language**: JavaScript/TypeScript
- **Database**: Multi-adapter (MySQL, PostgreSQL, SQLite, Supabase)
- **Deployment**: Vercel Serverless
- **Scraping**: Puppeteer + Playwright fallback
- **Monitoring**: Built-in logging and metrics

## 🚀 Quick Start

1. **Clone & Install**

    ```bash
    git clone <repo>
    cd ecommerce-coupon-scraper
    bun install
    ```

2. **Configure Environment**

    ```bash
    cp .env.example .env
    # Edit .env with your database credentials
    ```

3. **Run Migrations**

    ```bash
    bun run migrate
    ```

4. **Start Scraping**

    ```bash
    bun run scrape
    ```

5. **Deploy to Vercel**
    ```bash
    vercel deploy
    ```

## 📊 Database Schema

### Tables

- `platforms` - E-commerce platform configurations
- `merchants` - Merchant/brand information
- `coupons` - Coupon and promotion data
- `scrape_sessions` - Scraping session logs
- `scrape_metrics` - Performance metrics

## 🔧 Configuration

### Database Adapters

- MySQL: `mysql://user:pass@host:port/db`
- PostgreSQL: `postgresql://user:pass@host:port/db`
- SQLite: `sqlite://./data/coupons.db`
- Supabase: `supabase://project:key@api.supabase.co`

### Scraping Configuration

- Refresh interval: 1 minute (configurable)
- Concurrent scrapers: 5 (configurable)
- Timeout: 30 seconds per platform
- Retry attempts: 3

## 📈 Monitoring

- Real-time scraping metrics
- Error tracking and alerts
- Performance monitoring
- Data quality validation

## 🔒 Security

- Rate limiting
- User agent rotation
- Proxy support
- Anti-bot detection handling

## 📝 API Endpoints

- `GET /api/coupons` - Get all active coupons
- `GET /api/coupons/platform/:platform` - Get coupons by platform
- `GET /api/metrics` - Get scraping metrics
- `POST /api/scrape/trigger` - Trigger manual scrape

## 🧪 Testing

```bash
bun test                 # Run all tests
bun test:unit           # Unit tests only
bun test:integration    # Integration tests
bun test:e2e           # End-to-end tests
```

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Deployment Guide](./docs/deployment.md)
- [Contributing](./docs/contributing.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.
