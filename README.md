# 🚀 Nexvou Scripts Advanced Scraper System

A powerful, clean, and structured scraper system for collecting data on the best coupons, discounts, and promotions from various Indonesian and global e-commerce platforms.

## ✨ Features

- **Multi-Platform Support**: Shopee, Tokopedia, Lazada, Blibli, Traveloka, Grab
- **Clean Architecture**: Modular design with separation of responsibilities
- **Rate Limiting**: Intelligent speed limiting for each platform
- **Error Handling**: Reliable error handling and retry mechanisms
- **Anti-Bot Protection**: Countering anti-bot measures with user agent rotation
- **Database Integration**: Seamless integration with Supabase
- **Scheduling**: Built-in cron job scheduling
- **Logging**: Comprehensive logging system
- **Testing**: Built-in test suite

## 🏗️ Architecture

```
├── index.js                 # Main entry point
├── core/
│   ├── ScraperManager.js    # Orchestrates all scrapers
│   ├── DatabaseManager.js   # Database operations
│   └── BrowserManager.js    # Browser automation
├── scrapers/
│   ├── BaseScraper.js       # Base scraper class
│   ├── ShopeeScraper.js     # Shopee-specific scraper
│   ├── TokopediaScraper.js  # Tokopedia-specific scraper
│   └── ...                  # Other platform scrapers
├── utils/
│   ├── Logger.js            # Logging utility
│   └── RateLimiter.js       # Rate limiting utility
├── config/
│   └── scraper.config.js    # Configuration file
└── docs/                    # Documentation
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# For local development: SQLite is used automatically (no config needed)
# For production: Edit .env with your Supabase credentials
```

### 3. Test Connection

```bash
npm test
```

### 4. Run Single Platform

```bash
npm run scrape:shopee
npm run scrape:tokopedia
npm run scrape:lazada
```

### 5. Run All Platforms

```bash
npm run scrape
```

### 6. Start Scheduled Service

```bash
npm run scrape:schedule
```

## 📋 Commands

### Production Commands

| Command                    | Description                       |
| -------------------------- | --------------------------------- |
| `npm run scrape`           | Run all scrapers once             |
| `npm test`                 | Test all connections and scrapers |
| `npm run scrape:schedule`  | Start scheduled scraping service  |
| `npm run scrape:shopee`    | Scrape Shopee only                |
| `npm run scrape:tokopedia` | Scrape Tokopedia only             |
| `npm run scrape:lazada`    | Scrape Lazada only                |
| `npm run demo`             | Run demo with mock data           |

### Development Commands

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `npm run lint`         | Run ESLint code linting         |
| `npm run lint:fix`     | Fix ESLint issues automatically |
| `npm run format`       | Format code with Prettier       |
| `npm run format:check` | Check code formatting           |

## ⚙️ Configuration

Edit `config/scraper.config.js` to customize:

- **Platform URLs**: Target URLs for each platform
- **Selectors**: CSS selectors for data extraction
- **Limits**: Rate limits and timeouts
- **Schedules**: Cron job schedules

## 🔧 Environment Variables

### Development (SQLite)

```bash
NODE_ENV=development
DEBUG=true
# SQLite database is created automatically in ./data/scraper.db
```

### Production (Supabase)

```bash
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SCRAPER_HEADLESS=true
SCRAPER_TIMEOUT=30000
SCRAPER_MAX_ITEMS=50
```

## 🔧 Platform-Specific Features

### Shopee

- Flash sale scraping
- Daily discover deals
- Brand promotions
- Dynamic content handling

### Tokopedia

- Promo page scraping
- Flash sale deals
- Cashback offers
- Anti-bot bypass

### Lazada

- Flash sale items
- Voucher codes
- Free shipping deals
- Multiple layout support

### Blibli

- Product deals
- Voucher scraping
- Discount extraction

### Traveloka

- Travel promotions
- Flight deals
- Hotel discounts

### Grab

- Food delivery promos
- Mart discounts
- Short-term deals

## 🗄️ Database Support

### Dual Database System

- **Development**: SQLite database (automatic setup)
- **Production**: Supabase (PostgreSQL) database

### Automatic Database Selection

- `NODE_ENV=development` → Uses SQLite
- `NODE_ENV=production` → Uses Supabase

### SQLite Features (Development)

- Zero configuration required
- Automatic table creation and seeding
- Fast local development
- Database file: `./data/scraper.db`

### Supabase Features (Production)

- Scalable PostgreSQL database
- Real-time capabilities
- Built-in authentication
- Row Level Security (RLS)

## 📊 Data Processing

Each scraper processes raw data into structured format:

```javascript
{
  title: "Product/Promo Title",
  description: "Detailed description",
  discount_type: "percentage|fixed|shipping|cashback",
  discount_value: 25,
  coupon_code: "PROMO123",
  merchant_id: 1,
  source_url: "https://...",
  image_url: "https://...",
  status: "active",
  is_featured: false,
  valid_until: "2024-01-01T00:00:00Z",
  scraped_at: "2024-01-01T00:00:00Z"
}
```

## 🛡️ Anti-Bot Measures

- User agent rotation
- Request delays
- Cloudflare bypass
- CAPTCHA detection
- Rate limiting compliance

## 📈 Monitoring

The scraper provides comprehensive logging:

- **Info**: Successful operations
- **Warn**: Recoverable issues
- **Error**: Failed operations
- **Debug**: Detailed debugging info

## 🔄 Scheduling

Default schedule:

- **Main scraping**: Every 15 minutes
- **Cleanup expired**: Every hour
- **Update statistics**: Every 30 minutes

## 🧪 Testing

Run tests to verify:

- Database connectivity
- Browser functionality
- Platform accessibility
- Selector validity

```bash
npm test
```

## 🚨 Error Handling

- Automatic retries with exponential backoff
- Graceful degradation on failures
- Comprehensive error logging
- Platform-specific error handling

## 🔧 Troubleshooting

### Common Issues

1. **Browser launch fails**
    - Install required dependencies: `sudo apt-get install -y gconf-service libasound2-dev libatk1.0-dev`
    - Check system resources

2. **Selectors not working**
    - Website layout changed
    - Update selectors in config

3. **Rate limiting**
    - Adjust delays in config
    - Check platform-specific limits

4. **Database errors**
    - Verify Supabase credentials
    - Check table schemas

## 🛠️ Development Tools

This project includes modern development tools for code quality:

- **ESLint**: Code linting with custom rules
- **Prettier**: Automatic code formatting
- **Husky**: Git hooks for quality assurance
- **lint-staged**: Run linters on staged files only

### Git Hooks

- **Pre-commit**: Automatically lints and formats staged files
- **Commit-msg**: Validates commit message format
- **Pre-push**: Runs tests and checks before push

### Commit Message Format

Use conventional commit format:

```
feat(scraper): add new platform support
fix(database): resolve connection timeout
docs(readme): update installation guide
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the code standards (ESLint + Prettier)
4. Write tests for new features
5. Commit using conventional format
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

For detailed development guide, see [DEVELOPMENT.md](docs/DEVELOPMENT.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for [Nexvou Scripts](https://nexvou.com) - Indonesia's leading deals aggregator
- Powered by Supabase for database operations
- Uses Puppeteer for web automation
