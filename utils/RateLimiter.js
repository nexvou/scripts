class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.limits = {
            shopee: { requests: 10, window: 60000 }, // 10 requests per minute
            tokopedia: { requests: 15, window: 60000 },
            lazada: { requests: 12, window: 60000 },
            blibli: { requests: 20, window: 60000 },
            traveloka: { requests: 8, window: 60000 },
            grab: { requests: 10, window: 60000 },
            default: { requests: 10, window: 60000 },
        };
    }

    async wait(platform) {
        const limit = this.limits[platform] || this.limits.default;
        const now = Date.now();

        if (!this.requests.has(platform)) {
            this.requests.set(platform, []);
        }

        const requests = this.requests.get(platform);

        // Remove old requests outside the window
        const validRequests = requests.filter(time => now - time < limit.window);
        this.requests.set(platform, validRequests);

        // Check if we're at the limit
        if (validRequests.length >= limit.requests) {
            const oldestRequest = Math.min(...validRequests);
            const waitTime = limit.window - (now - oldestRequest);

            if (waitTime > 0) {
                await this.delay(waitTime);
            }
        }

        // Add current request
        validRequests.push(now);
        this.requests.set(platform, validRequests);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus(platform) {
        const limit = this.limits[platform] || this.limits.default;
        const requests = this.requests.get(platform) || [];
        const now = Date.now();

        const validRequests = requests.filter(time => now - time < limit.window);

        return {
            platform,
            requests: validRequests.length,
            limit: limit.requests,
            window: limit.window,
            remaining: limit.requests - validRequests.length,
        };
    }
}

module.exports = RateLimiter;
