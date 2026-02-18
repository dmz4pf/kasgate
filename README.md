# KasGate — Universal Kaspa Payment Gateway

Accept Kaspa cryptocurrency payments on any website with a single API call.

[![CI](https://github.com/dmustapha/kasgate/actions/workflows/ci.yml/badge.svg)](https://github.com/dmustapha/kasgate/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-71%20passing-brightgreen)](https://github.com/dmustapha/kasgate/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

![KasGate Dashboard](docs/images/dashboard.png)

## Live Demo

**[kasgate-production.up.railway.app/dashboard](https://kasgate-production.up.railway.app/dashboard)**

Create a free account to explore the full dashboard.

## Demo Video

[![KasGate Demo](https://img.youtube.com/vi/vmAQz18icq4/maxresdefault.jpg)](https://youtu.be/vmAQz18icq4?si=dvoD1WaTgFEod8jf)

---

## What Is KasGate?

KasGate is the Stripe of Kaspa. Register as a merchant, get an API key, and start accepting KAS payments in minutes.

- Create a payment session with one POST request
- KasGate generates a unique Kaspa address per payment
- Your webhook fires when the blockchain confirms the transaction
- Track everything from the dashboard in real time

---

## Screenshots

| Dashboard | Sessions | Integration |
|-----------|----------|-------------|
| ![Dashboard](docs/images/dashboard.png) | ![Sessions](docs/images/sessions.png) | ![Integration](docs/images/integration.png) |

---

## Features

- **Simple API**: Create payments with a single `POST` request
- **Real-time updates**: WebSocket-powered payment notifications
- **Non-custodial**: Merchants control their own keys via xPub HD wallet
- **Webhook system**: HMAC-signed server-to-server notifications
- **Drop-in widget**: Embed a payment form in 3 lines of HTML
- **Kasware support**: One-click payments with browser wallet
- **Multi-network**: Single env var switches testnet to mainnet
- **71 tests**: Unit and integration tests across all critical paths

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

## Testing the Full Flow

Here's how to go from zero to receiving a confirmed payment end-to-end.

**Step 1: Get a Kaspa xPub key**

You need a Kaspa wallet that exposes your xPub (extended public key). Use either:
- **[Kaspa-NG](https://kaspa-ng.org)** — open your wallet, go to Settings → Export xPub
- **[KasWare](https://kasware.xyz)** — browser extension, go to Account Details → Export xPub

**Step 2: Register as a merchant**

Go to [kasgate-production.up.railway.app/dashboard/register](https://kasgate-production.up.railway.app/dashboard/register), enter your xPub key and create your account. Your API key will be shown on the dashboard.

**Step 3: Create a payment session**

```bash
curl -X POST https://kasgate-production.up.railway.app/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{"amount": "1", "orderId": "test_001"}'
```

Response:
```json
{
  "id": "sess_abc123",
  "address": "kaspa:qr...",
  "amount": "1",
  "status": "pending"
}
```

**Step 4: Send KAS to the generated address**

Open Kaspa-NG or KasWare and send the exact amount to the `address` from the response. Use testnet-10 for testing — no real KAS needed.

**Step 5: Watch the session confirm**

Poll the session status or check the dashboard:

```bash
curl https://kasgate-production.up.railway.app/api/v1/sessions/sess_abc123 \
  -H "X-API-Key: your_api_key"
```

Status will move from `pending` → `confirmed` once the blockchain picks it up.

**Step 6: Webhook fires**

If you registered a webhook URL, KasGate sends a signed POST to your server with the confirmation. Check **Webhook Logs** on the dashboard to see delivery attempts and responses.

---

## Quick Start

### 1. Register as a merchant

Visit the [dashboard](https://kasgate-production.up.railway.app/dashboard/register) and create an account with your Kaspa xPub key.

To get your xPub key, use either:
- **[Kaspa-NG](https://kaspa-ng.org)** — desktop/web wallet, find xPub under wallet settings
- **[KasWare](https://kasware.xyz)** — browser extension wallet, export xPub from account details

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
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-kasgate-signature'];
  const expected = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(req.body).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  const { event, sessionId, txId } = JSON.parse(req.body);

  if (event === 'payment.confirmed') {
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
git clone https://github.com/dmustapha/kasgate.git
cd kasgate
bun install
cp .env.example .env
bun run dev
```

Visit `http://localhost:3000/dashboard`

```bash
# Run tests
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
