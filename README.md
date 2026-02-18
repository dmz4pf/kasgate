# KasGate — Universal Kaspa Payment Gateway

> Accept Kaspa cryptocurrency payments on any website with a single API call.

[![CI](https://github.com/dmz4pf/kasgate/actions/workflows/ci.yml/badge.svg)](https://github.com/dmz4pf/kasgate/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-71%20passing-brightgreen)](https://github.com/dmz4pf/kasgate/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

![KasGate Dashboard](docs/images/dashboard.png)

## Live Demo

**[→ kasgate-production.up.railway.app/dashboard](https://kasgate-production.up.railway.app/dashboard)**

Create a free account to explore the full dashboard.

---

## What Is KasGate?

KasGate is the Stripe of Kaspa — a payment infrastructure layer that lets any developer accept KAS payments without managing blockchain complexity.

- Merchants register once, get an API key
- Create a payment session with one API call
- KasGate generates a unique Kaspa address per payment
- Webhook fires when the blockchain confirms the transaction
- Dashboard tracks all payments in real time

---

## Screenshots

| Dashboard | Sessions | Integration |
|-----------|----------|-------------|
| ![Dashboard](docs/images/dashboard.png) | ![Sessions](docs/images/sessions.png) | ![Integration](docs/images/integration.png) |

---

## Features

- **Simple API** — Create payments with a single `POST` request
- **Real-time Updates** — WebSocket-powered instant payment notifications
- **Non-Custodial** — Merchants control their own keys (xPub HD wallet)
- **Webhook System** — HMAC-signed server-to-server notifications
- **Drop-in Widget** — Embed a payment form in 3 lines of HTML
- **Kasware Integration** — One-click payments with browser wallet
- **REST Fallback** — Polling backup when WebSocket unavailable
- **Multi-network** — Single env var switches testnet ↔ mainnet
- **71 Tests** — Comprehensive test coverage across all critical paths

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Backend | TypeScript, Express |
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Database | SQLite via better-sqlite3 |
| Blockchain | Kaspa RPC (testnet-10 / mainnet) |
| Testing | Vitest |
| Deployment | Railway |

---

## Quick Start

### 1. Register as a merchant

Visit the [dashboard](https://kasgate-production.up.railway.app/dashboard/register) and create an account with your Kaspa xPub key.

### 2. Create a payment

```javascript
const response = await fetch('https://kasgate-production.up.railway.app/api/v1/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    amount: '10.5',
    orderId: 'order_123'
  })
});

const session = await response.json();
console.log(session.address); // kaspa:qr... — send payment here
console.log(session.id);      // sess_abc123 — track status
```

### 3. Receive payment confirmation

```javascript
// Your webhook endpoint
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // Verify HMAC-SHA256 signature
  const signature = req.headers['x-kasgate-signature'];
  const expected = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.body).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  const { event, sessionId, txId } = JSON.parse(req.body);

  if (event === 'payment.confirmed') {
    // Fulfill the order
    console.log('Payment confirmed:', txId);
  }

  res.status(200).send('OK');
});
```

### Optional: Drop-in Widget

```html
<script src="https://kasgate-production.up.railway.app/widget/kasgate.js"></script>
<kas-gate
  api-key="your_api_key"
  amount="10.5"
  order-id="order_123"
  theme="dark"
></kas-gate>
```

---

## API Reference

All endpoints require `X-API-Key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/sessions` | Create a payment session |
| `GET` | `/api/v1/sessions/:id` | Get payment status |
| `POST` | `/api/v1/sessions/:id/cancel` | Cancel a pending payment |
| `GET` | `/api/v1/merchants/me` | Get merchant profile |
| `GET` | `/api/v1/merchants/me/sessions` | List all payments |
| `GET` | `/api/v1/merchants/me/stats` | Payment statistics |
| `GET` | `/api/v1/merchants/me/analytics` | Revenue analytics |
| `GET` | `/api/v1/merchants/me/webhook-logs` | Webhook delivery logs |

---

## Running Locally

```bash
git clone https://github.com/dmz4pf/kasgate.git
cd kasgate
bun install
cp .env.example .env   # configure your environment
bun run dev
```

Visit `http://localhost:3000/dashboard`

### Running Tests

```bash
bun test
```

---

## Architecture

```
┌─────────────────┐     POST /api/v1/sessions      ┌──────────────────┐
│   Your Website  │ ──────────────────────────────> │  KasGate Server  │
│  (any frontend) │ <── { address, sessionId } ──── │  (Express + Bun) │
└─────────────────┘                                 └────────┬─────────┘
                                                             │
                          ┌──────────────────────────────────┤
                          │                                  │
                   ┌──────▼──────┐                   ┌───────▼───────┐
                   │  Kaspa RPC  │                   │   SQLite DB   │
                   │  (Testnet / │                   │  (Payments,   │
                   │   Mainnet)  │                   │   Merchants)  │
                   └──────┬──────┘                   └───────────────┘
                          │
              Payment confirmed on-chain
                          │
                   ┌──────▼──────┐
                   │   Webhook   │
                   │  (HMAC sig) │ ──> Your server notified
                   └─────────────┘
```

---

## License

MIT
