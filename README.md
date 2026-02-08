# KasGate — Universal Kaspa Payment Widget

> Add KAS payments to any website in 3 lines of code

KasGate is a drop-in payment widget that enables any website to accept Kaspa payments. Think Stripe Checkout, but for Kaspa.

## Features

- 🚀 **Simple Integration** — Add payments with just 3 lines of code
- ⚡ **Real-time Updates** — WebSocket-powered instant payment notifications
- 🔒 **Non-Custodial** — Merchants control their own keys (xPub-based HD wallet)
- 🌐 **Network Agnostic** — Single env var switches between testnet and mainnet
- 📱 **Responsive** — Works on desktop, tablet, and mobile
- 🎨 **Themeable** — Light and dark modes, customizable styling
- 🔗 **Kasware Integration** — One-click payments with browser wallet
- 📡 **Webhooks** — Server-to-server notifications with HMAC signing
- 🔄 **Fallbacks** — REST polling backup when WebSocket unavailable

## Quick Start

### 1. Add the Script

```html
<script src="https://your-server.com/widget/kasgate.js"></script>
```

### 2. Add the Widget

```html
<kas-gate
  merchant-id="your-merchant-id"
  amount="10"
  api-key="your-api-key"
  server-url="https://your-server.com"
></kas-gate>
```

### 3. Done! Accept Kaspa payments.

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/kasgate.git
cd kasgate

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## Configuration

Edit `.env` to configure:

```env
# Network: "mainnet" or "testnet-10"
KASPA_NETWORK=testnet-10

# Server Configuration
PORT=3000
HOST=localhost

# Your xPub key (get from your HD wallet)
MERCHANT_XPUB=xpub...

# Webhook secret for signing payloads
WEBHOOK_SECRET=your_secret_here
```

## API Endpoints

### Sessions

- `POST /api/v1/sessions` — Create a payment session
- `GET /api/v1/sessions/:id` — Get session details
- `GET /api/v1/sessions/:id/status` — Get session status (lightweight)
- `POST /api/v1/sessions/:id/cancel` — Cancel a pending session

### Merchants

- `POST /api/v1/merchants` — Register a new merchant
- `GET /api/v1/merchants/me` — Get current merchant
- `PATCH /api/v1/merchants/me` — Update merchant settings
- `GET /api/v1/merchants/me/sessions` — Get payment history
- `GET /api/v1/merchants/me/stats` — Get statistics

### Health

- `GET /health` — Basic health check
- `GET /health/detailed` — Detailed system status
- `GET /health/ready` — Kubernetes readiness probe
- `GET /health/live` — Kubernetes liveness probe

## Widget API

### HTML Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| `merchant-id` | Yes | Your merchant ID |
| `amount` | Yes | Payment amount in KAS |
| `api-key` | Yes | Your API key |
| `server-url` | No | Server URL (default: current origin) |
| `order-id` | No | Your internal order ID |
| `theme` | No | "light" or "dark" |

### JavaScript API

```javascript
// Create payment programmatically
const payment = KasGate.createPayment('#container', {
  merchantId: 'your-merchant-id',
  amount: '10',
  apiKey: 'your-api-key',
  serverUrl: 'https://your-server.com',
  orderId: 'ORDER-123',
  metadata: { product: 'Premium Plan' },
  theme: 'dark',
  onConfirmed: (session) => {
    console.log('Payment confirmed!', session.txId);
  },
  onExpired: (session) => {
    console.log('Payment expired');
  },
  onError: (error) => {
    console.error('Payment error:', error);
  }
});

// Open payment in modal
const { element, close } = KasGate.openModal({
  merchantId: 'your-merchant-id',
  amount: '10',
  apiKey: 'your-api-key'
});
```

### Events

```javascript
const element = document.querySelector('kas-gate');

element.addEventListener('statechange', (e) => {
  console.log('State:', e.detail.state);
  console.log('Session:', e.detail.session);
});
```

## Webhooks

KasGate sends webhooks for payment events:

```json
{
  "event": "payment.confirmed",
  "sessionId": "uuid",
  "merchantId": "uuid",
  "amount": "1000000000",
  "address": "kaspatest:qr...",
  "txId": "abc123...",
  "confirmations": 10,
  "orderId": "ORDER-123",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### Event Types

- `payment.pending` — Session created
- `payment.confirming` — Payment detected, awaiting confirmations
- `payment.confirmed` — Payment fully confirmed
- `payment.expired` — Session expired without payment
- `payment.failed` — Payment failed

### Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// In your webhook handler:
const signature = req.headers['x-kasgate-signature'];
if (!verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET)) {
  return res.status(401).send('Invalid signature');
}
```

## Demo Sites

Three demo sites are included:

- **Store** (`/demos/store.html`) — E-commerce product checkout
- **Donate** (`/demos/donate.html`) — Donation page with preset amounts
- **Tip Jar** (`/demos/tipjar.html`) — Creator tipping with messages

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run tests
npm test

# Build widget only
npm run build:widget
```

## Project Structure

```
kasgate/
├── src/
│   ├── config/         # Network configuration
│   ├── kaspa/          # Kaspa SDK integration
│   ├── server/         # Express backend
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Business logic
│   │   ├── middleware/ # Auth, validation, errors
│   │   ├── websocket/  # Socket.io server
│   │   └── db/         # SQLite database
│   ├── widget/         # Frontend widget
│   │   ├── styles/     # Theme and CSS
│   │   ├── utils/      # API client, formatters
│   │   └── integrations/ # Kasware wallet
│   └── shared/         # Shared constants, validation
├── demos/              # Demo HTML pages
├── dist/               # Build output
└── data/               # SQLite database files
```

## Tech Stack

- **Widget**: Vanilla JS, Web Components, Shadow DOM
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: SQLite (better-sqlite3)
- **Real-time**: Socket.io
- **Kaspa SDK**: kaspa (WASM)
- **Build**: esbuild

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with 💚 for [Kaspathon 2026](https://kaspathon.dev)
