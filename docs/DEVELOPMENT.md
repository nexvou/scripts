# 🛠️ Development Guide

Panduan lengkap untuk development sistem scraper Kupon.id.

## 📋 Daftar Isi

- [Setup Development Environment](#setup-development-environment)
- [Code Standards](#code-standards)
- [Git Workflow](#git-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Contributing](#contributing)

## Setup Development Environment

### Prerequisites
- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Installation
```bash
# Clone repository
git clone https://github.com/nexvou/scripts.git
cd scripts

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Test installation
npm test
```

### Development Tools
The project includes several development tools:

- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality assurance
- **lint-staged**: Run linters on staged files

## Code Standards

### ESLint Configuration
The project uses ESLint with the following rules:
- **Quotes**: Single quotes preferred
- **Semicolons**: Always required
- **Indentation**: 2 spaces
- **Max line length**: 100 characters
- **Trailing commas**: Always in multiline

### Prettier Configuration
Prettier is configured with:
- **Print width**: 100 characters
- **Tab width**: 2 spaces
- **Single quotes**: true
- **Trailing commas**: ES5 style
- **Semicolons**: true

### File Structure
```
scripts/
├── bin/           # CLI executables
├── config/        # Configuration files
├── core/          # Core system components
├── demo/          # Demo and examples
├── docs/          # Documentation
├── scrapers/      # Platform scrapers
├── utils/         # Utility functions
└── .husky/        # Git hooks
```

## Git Workflow

### Commit Message Format
Use conventional commit format:
```
type(scope): description

feat(scraper): add new platform support
fix(database): resolve connection timeout
docs(readme): update installation guide
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tooling changes
- `perf`: Performance improvements

### Git Hooks

#### Pre-commit Hook
Automatically runs on `git commit`:
- Lints staged files with ESLint
- Formats code with Prettier
- Fixes auto-fixable issues

#### Commit Message Hook
Validates commit message format:
- Enforces conventional commit format
- Provides helpful error messages

#### Pre-push Hook
Runs before `git push`:
- Runs full test suite
- Runs complete linting
- Checks code formatting
- Prevents push if any check fails

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `fix/*`: Bug fix branches
- `hotfix/*`: Critical fixes

## Testing

### Test Commands
```bash
# Run all tests
npm test

# Run specific platform test
npm run scrape:shopee -- --test

# Run demo mode
npm run demo
```

### Test Types
1. **Connection Tests**: Database and browser connectivity
2. **Scraper Tests**: Individual platform scraper functionality
3. **Integration Tests**: End-to-end scraping workflow

### Writing Tests
```javascript
// Example test structure
describe('ShopeeScraper', () => {
  it('should extract items correctly', async () => {
    const scraper = new ShopeeScraper(config, db, browser);
    const result = await scraper.test();
    expect(result).toBe(true);
  });
});
```

## Debugging

### Debug Mode
Enable debug logging:
```bash
DEBUG=true NODE_ENV=development npm run scrape:shopee
```

### Browser Debugging
Run in non-headless mode:
```bash
SCRAPER_HEADLESS=false npm run scrape:shopee
```

### Database Debugging
Test database connection:
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('merchants').select('*').then(console.log);
"
```

### Common Debug Scenarios

#### Selectors Not Working
1. Run in non-headless mode
2. Check browser console for errors
3. Inspect HTML structure changes
4. Update selectors in config

#### Rate Limiting Issues
1. Check rate limiter status
2. Adjust delays in configuration
3. Monitor request patterns

#### Memory Issues
1. Monitor with `npm run monitor`
2. Check for memory leaks
3. Adjust browser settings

## Development Scripts

### Available Scripts
```bash
# Development
npm run dev              # Start in development mode
npm run demo             # Run demo with mock data

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Scraping
npm run scrape           # Run all scrapers
npm run scrape:single    # Run single platform
npm run scrape:schedule  # Start scheduled service
```

### Custom Scripts
Add custom scripts to `package.json`:
```json
{
  "scripts": {
    "custom:task": "node scripts/custom-task.js"
  }
}
```

## Contributing

### Before Contributing
1. Read the documentation
2. Check existing issues
3. Follow code standards
4. Write tests for new features

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Ensure all checks pass
5. Submit pull request

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact considered

## IDE Setup

### VS Code
Recommended extensions are configured in `.vscode/extensions.json`:
- ESLint
- Prettier
- Path Intellisense
- Auto Rename Tag

### Settings
VS Code settings are configured in `.vscode/settings.json`:
- Format on save enabled
- ESLint auto-fix on save
- Proper file associations

## Performance Monitoring

### Memory Usage
```bash
# Monitor memory usage
node --inspect index.js --schedule

# Use Chrome DevTools for profiling
# Navigate to chrome://inspect
```

### CPU Profiling
```bash
# Generate CPU profile
node --prof index.js --single shopee

# Process profile
node --prof-process isolate-*.log > profile.txt
```

### Database Performance
```javascript
// Monitor database queries
const startTime = Date.now();
await db.saveBatch(items);
console.log(`Batch save took: ${Date.now() - startTime}ms`);
```

## Troubleshooting Development Issues

### Common Issues

#### Husky Hooks Not Working
```bash
# Reinstall husky
npm run prepare
chmod +x .husky/*
```

#### ESLint Configuration Conflicts
```bash
# Clear ESLint cache
npx eslint --cache-location .eslintcache --cache .
```

#### Prettier Formatting Issues
```bash
# Check Prettier configuration
npx prettier --check .
npx prettier --write .
```

#### Git Hooks Failing
```bash
# Skip hooks temporarily (not recommended)
git commit --no-verify

# Fix issues and commit normally
npm run lint:fix
npm run format
git add .
git commit
```

### Getting Help
1. Check documentation in `docs/`
2. Search existing issues
3. Create detailed issue report
4. Join community discussions

## Best Practices

### Code Organization
- Keep functions small and focused
- Use descriptive variable names
- Add comments for complex logic
- Follow single responsibility principle

### Error Handling
- Always use try-catch for async operations
- Log errors with context
- Implement graceful degradation
- Provide meaningful error messages

### Performance
- Use batch operations for database
- Implement proper caching
- Monitor memory usage
- Optimize browser settings

### Security
- Validate all inputs
- Use environment variables for secrets
- Implement rate limiting
- Follow security best practices

---

*For more detailed information, refer to other documentation files in the `docs/` directory.*