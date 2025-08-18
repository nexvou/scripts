# Contributing Guide

Thank you for your interest in contributing to the E-Commerce Coupon Scraper!

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**

    ```bash
    git clone https://github.com/nexvou/scripts.git
    cd scripts
    ```

3. **Install dependencies**

    ```bash
    npm install
    ```

4. **Create a feature branch**
    ```bash
    git checkout -b feature/your-feature-name
    ```

## 🧪 Testing

Before submitting a PR, make sure all tests pass:

```bash
# Test browser setup
node test-browser.js

# Test all scrapers
node index.js --test

# Test single platform
node index.js --single shopee

# Run unit tests
npm test
```

## 📝 Code Style

- Use **CommonJS** modules (`require`/`module.exports`)
- Follow **ESLint** configuration
- Use **Prettier** for formatting
- Add **JSDoc** comments for functions
- Use **meaningful variable names**

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## 🏗️ Adding New Platforms

1. **Create scraper file**

    ```bash
    cp scrapers/ShopeeScraper.js scrapers/YourPlatformScraper.js
    ```

2. **Update configuration**

    ```javascript
    // config/scraper.config.js
    yourplatform: {
        name: 'YourPlatform',
        slug: 'yourplatform',
        enabled: true,
        urls: {
            deals: 'https://yourplatform.com/deals',
        },
        selectors: {
            // CSS selectors for scraping
        }
    }
    ```

3. **Register scraper**
    ```javascript
    // core/ScraperManager.js
    const YourPlatformScraper = require('../scrapers/YourPlatformScraper');
    ```

## 🔧 Debugging

1. **Enable debug mode**

    ```bash
    DEBUG=* node index.js --single yourplatform
    ```

2. **Take screenshots**

    ```javascript
    await page.screenshot({ path: 'debug.png' });
    ```

3. **Check selectors**
    ```bash
    node debug-yourplatform.js
    ```

## 📋 Pull Request Guidelines

1. **Descriptive title** - Clearly describe what the PR does
2. **Detailed description** - Explain the changes and why they're needed
3. **Test coverage** - Include tests for new features
4. **Documentation** - Update docs if needed
5. **Small commits** - Keep commits focused and atomic

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] New tests added
- [ ] Manual testing completed

## Screenshots (if applicable)

Add screenshots for UI changes
```

## 🐛 Bug Reports

Use the issue template and include:

1. **Environment details** (OS, Node version, browser)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Error logs/screenshots**
5. **Minimal reproduction case**

## 💡 Feature Requests

1. **Clear use case** - Explain why the feature is needed
2. **Detailed specification** - How should it work?
3. **Implementation ideas** - Any thoughts on implementation?
4. **Breaking changes** - Will it break existing functionality?

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update API documentation for endpoint changes
- Add examples for new features

## 🎯 Areas for Contribution

### High Priority

- [ ] Improve selector accuracy for existing platforms
- [ ] Add more Indonesian e-commerce platforms
- [ ] Enhance anti-detection mechanisms
- [ ] Performance optimizations

### Medium Priority

- [ ] Add more database adapters
- [ ] Improve error handling
- [ ] Add more comprehensive tests
- [ ] Better logging and monitoring

### Low Priority

- [ ] UI dashboard for monitoring
- [ ] Docker containerization
- [ ] CI/CD improvements
- [ ] Code refactoring

## 🏆 Recognition

Contributors will be:

- Added to the contributors list
- Mentioned in release notes
- Given credit in documentation

## 📞 Getting Help

- **GitHub Issues** - For bugs and feature requests
- **GitHub Discussions** - For questions and ideas
- **Code Review** - We'll help review your PRs

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
