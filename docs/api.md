# API Documentation

## Base URL

```
https://your-app.vercel.app/api
```

## Authentication

Some endpoints require API key authentication:

```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### GET /api/coupons

Get active coupons with filtering options.

**Query Parameters:**

- `platform` (string) - Filter by platform slug (shopee, tokopedia, etc.)
- `merchant` (string) - Filter by merchant slug
- `status` (string) - Filter by status (active, expired, disabled)
- `featured` (boolean) - Filter featured coupons only
- `discount_type` (string) - Filter by discount type (percentage, fixed, shipping, cashback, bogo)
- `limit` (number) - Number of results (max 100, default 50)
- `offset` (number) - Pagination offset (default 0)

**Example:**

```bash
GET /api/coupons?platform=shopee&limit=20&featured=true
```

**Response:**

```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "title": "Flash Sale 12.12 - Smartphone & Elektronik",
            "description": "Diskon hingga 80% untuk smartphone...",
            "discount_type": "percentage",
            "discount_value": 80,
            "coupon_code": "FLASHSALE1212",
            "platform_name": "Shopee",
            "merchant_name": null,
            "source_url": "https://shopee.co.id/flash_sale",
            "image_url": "https://cf.shopee.co.id/file/...",
            "status": "active",
            "is_featured": true,
            "valid_until": "2025-12-12T23:59:59Z",
            "created_at": "2025-08-15T02:00:00Z"
        }
    ],
    "pagination": {
        "total": 150,
        "limit": 20,
        "offset": 0,
        "hasMore": true
    },
    "timestamp": "2025-08-15T10:30:00Z"
}
```

### GET /api/status

Get system status and metrics.

**Response:**

```json
{
    "success": true,
    "data": {
        "isRunning": true,
        "currentSession": null,
        "totalScrapers": 4,
        "activeScrapers": 0,
        "lastUpdate": "2025-08-15T10:30:00Z",
        "metrics": {
            "totalActiveCoupons": 1250,
            "totalActivePlatforms": 4
        },
        "scrapers": {
            "shopee": {
                "name": "Shopee",
                "status": "completed",
                "lastRun": "2025-08-15T10:29:00Z",
                "enabled": true
            }
        },
        "version": "1.0.0",
        "environment": "production",
        "uptime": 3600,
        "memory": {
            "rss": 45678592,
            "heapTotal": 29360128,
            "heapUsed": 20123456
        }
    },
    "timestamp": "2025-08-15T10:30:00Z"
}
```

### POST /api/scrape/trigger

Trigger manual scraping (requires authentication).

**Headers:**

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Body:**

```json
{
    "platform": "shopee" // Optional: specific platform
}
```

**Response:**

```json
{
    "success": true,
    "message": "Scraping triggered successfully",
    "data": {
        "platform": "Shopee",
        "found": 25,
        "saved": 23,
        "errors": 2,
        "duration": 45000
    },
    "timestamp": "2025-08-15T10:30:00Z"
}
```

## Error Responses

All endpoints return consistent error format:

```json
{
    "success": false,
    "error": "Error type",
    "message": "Detailed error message",
    "timestamp": "2025-08-15T10:30:00Z"
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- 100 requests per minute per IP
- 1000 requests per hour per IP

## CORS

All API endpoints support CORS for web applications:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```
