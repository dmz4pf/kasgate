# KasGate Security Documentation

This document details the security measures implemented in KasGate and best practices for secure deployment.

## Table of Contents

- [API Key Security](#api-key-security)
- [Webhook Verification](#webhook-verification)
- [Rate Limiting](#rate-limiting)
- [Input Validation](#input-validation)
- [Network Security](#network-security)
- [Data Protection](#data-protection)
- [Best Practices](#best-practices)

---

## API Key Security

### Key Generation

API keys are generated on merchant registration using cryptographically secure random bytes:

```javascript
// 32 bytes of entropy, base64url encoded
const apiKey = crypto.randomBytes(32).toString('base64url');
// Result: "kg_live_abc123xyz..." (44 characters)
```

### Key Storage

**Keys are never stored in plaintext.** Only a SHA-256 hash is stored in the database:

```javascript
const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
// The plaintext key is shown only once during registration
```

### Timing-Safe Verification

API key verification uses timing-safe comparison to prevent timing attacks:

```javascript
const receivedHash = crypto.createHash('sha256').update(providedKey).digest('hex');
const isValid = crypto.timingSafeEqual(
  Buffer.from(receivedHash),
  Buffer.from(storedHash)
);
```

### Key Rotation

Merchants can regenerate API keys through the dashboard:

1. Old key is immediately invalidated
2. New key is generated and shown once
3. All active sessions remain valid (keys are per-merchant, not per-session)

---

## Webhook Verification

### HMAC-SHA256 Signatures

All webhooks are signed with HMAC-SHA256 using the merchant's webhook secret:

```javascript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

### Verification Code Example

Merchants should verify webhook signatures:

```javascript
// Node.js
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express middleware
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-kasgate-signature'];
  const timestamp = req.headers['x-kasgate-timestamp'];
  const deliveryId = req.headers['x-kasgate-delivery-id'];

  if (!verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Verify timestamp is within 5 minutes
  const webhookTime = new Date(timestamp);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;
  if (Math.abs(now - webhookTime) > fiveMinutes) {
    return res.status(401).send('Timestamp too old');
  }

  // Process webhook...
});
```

### Replay Protection

Each webhook includes:

| Header | Purpose |
|--------|---------|
| `X-KasGate-Timestamp` | ISO 8601 timestamp - verify within 5 minutes |
| `X-KasGate-Delivery-Id` | Unique UUID - track for idempotency |

**Merchants should:**
1. Verify timestamp is within 5 minutes of current time
2. Store delivery IDs and reject duplicates
3. Use signature to verify payload integrity

### Webhook Headers

```
X-KasGate-Signature: abc123...
X-KasGate-Event: payment.confirmed
X-KasGate-Timestamp: 2024-01-15T10:30:00.000Z
X-KasGate-Delivery-Id: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

---

## Rate Limiting

### Limits by Endpoint

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints | 1000 requests | 1 minute |
| `POST /merchants` | 10 requests | 1 hour |
| `POST /sessions` | 100 requests | 1 minute |

### Implementation

Rate limiting uses `express-rate-limit` with in-memory storage:

```javascript
const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 1000,
  message: { error: 'Too many requests' },
  standardHeaders: true,  // Return rate limit info in headers
});
```

### Rate Limit Headers

Response includes standard rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705315800
```

### Handling Rate Limits

When rate limited, you'll receive:

```json
HTTP 429 Too Many Requests
{
  "error": "Too many requests, please try again later"
}
```

---

## Input Validation

### Zod Schema Validation

All inputs are validated using Zod schemas:

```javascript
const createSessionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
  orderId: z.string().max(100).optional(),
  metadata: z.record(z.string()).optional(),
});
```

### XPub Validation

Extended public keys are validated using the kaspa-wasm library:

```javascript
import * as kaspaWasm from '@dfns/kaspa-wasm';

function validateXPub(xpub) {
  try {
    const instance = new kaspaWasm.XPub(xpub);
    instance.free();  // Prevent memory leaks
    return true;
  } catch {
    return false;
  }
}
```

### XSS Prevention

All user-supplied strings are sanitized:

```javascript
function sanitizeString(str) {
  // Remove ALL HTML tags
  let sanitized = str.replace(/<[^>]*>/g, '');
  // Remove dangerous protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  // Remove event handlers
  sanitized = sanitized.replace(/\bon\w+\s*=/gi, '');
  return sanitized.trim();
}
```

### Metadata Limits

Custom metadata has strict limits:

- Maximum 20 keys
- Key names: max 50 characters
- Values: max 500 characters
- Total size: max 1KB

---

## Network Security

### CORS Configuration

CORS is configured per endpoint type:

**API Endpoints (restricted):**
```javascript
const apiCorsOptions = {
  origin: getAllowedOrigins(),  // From CORS_ALLOWED_ORIGINS env
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
};
```

**Widget Endpoints (public):**
```javascript
const widgetCorsOptions = {
  origin: '*',  // Allow embedding from any site
  methods: ['GET'],
};
```

### Security Headers

Helmet.js provides security headers:

```javascript
app.use(helmet({
  contentSecurityPolicy: false,  // Disabled for widget embedding
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

Response headers include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (when behind HTTPS proxy)

### WebSocket Security

WebSocket connections require a subscription token:

```javascript
// Token generated with session
const subscriptionToken = crypto.randomBytes(32).toString('base64url');

// Client must provide token to subscribe
ws.on('connection', (socket) => {
  socket.on('subscribe', ({ sessionId, token }) => {
    if (!verifyToken(sessionId, token)) {
      socket.close(4001, 'Invalid token');
    }
  });
});
```

---

## Data Protection

### Database Security

1. **SQLite file permissions**: `chmod 600 data/kasgate.db`
2. **No sensitive data in logs**: API keys never logged
3. **Prepared statements**: All queries use parameterized statements

### Sensitive Data Handling

| Data | Storage | Notes |
|------|---------|-------|
| API Keys | SHA-256 hash only | Plaintext shown once |
| Webhook Secrets | Plaintext | Transmitted securely |
| xPub Keys | Plaintext | Public keys, no risk |
| Addresses | Plaintext | Public blockchain data |

### Data Retention

- Sessions are kept indefinitely for audit trail
- Webhook logs stored with delivery status
- No automatic data deletion (implement per compliance needs)

---

## Best Practices

### For Merchants

1. **Store API key securely** - Use environment variables, never commit to code
2. **Verify webhook signatures** - Always validate HMAC signature
3. **Check timestamp freshness** - Reject webhooks older than 5 minutes
4. **Track delivery IDs** - Prevent duplicate processing
5. **Use HTTPS** - All webhook URLs must be HTTPS in production
6. **Rotate keys periodically** - Regenerate API key if compromised

### For Deployment

1. **Run behind HTTPS** - Use nginx with Let's Encrypt
2. **Set CORS_ALLOWED_ORIGINS** - Don't use `*` in production
3. **Restrict database permissions** - Only app user should access
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Enable firewall** - Only expose ports 80/443
6. **Monitor logs** - Watch for unusual patterns

### Security Checklist

```
[ ] NODE_ENV=production
[ ] CORS_ALLOWED_ORIGINS configured
[ ] SSL/TLS enabled (HTTPS)
[ ] Database file permissions restricted (600)
[ ] Firewall configured (80, 443 only)
[ ] Webhook URLs use HTTPS
[ ] Monitoring enabled
[ ] Backup encryption enabled
[ ] Dependencies audited (npm audit)
[ ] Server security updates applied
```

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do not** disclose publicly until fixed
2. Email security details to the maintainers
3. Include steps to reproduce
4. Allow reasonable time for a fix

We appreciate security researchers who help keep KasGate safe.
