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

Here's how to go from zero to a confirmed payment, end-to-end. No real KAS needed — KasGate runs on Kaspa testnet-10.

---

### Part 1: Setup (one time)

**1. Get a Kaspa wallet and export your xPub key**

You need a Kaspa wallet that lets you export your xPub (extended public key). This is how KasGate generates a unique deposit address per payment without storing your private key.

Option A — **[Kaspa-NG](https://kaspa-ng.org)** (desktop/web):
- Create a wallet and switch to testnet-10 in settings
- Go to Wallet → Settings → Export xPub
- Copy the key starting with `xpub...`

Option B — **[KasWare](https://kasware.xyz)** (browser extension):
- Install the extension and create a wallet
- Switch network to testnet-10
- Go to Account Details → Export xPub

**2. Get testnet KAS from the faucet**

Go to **[faucet.kaspanet.io](https://faucet.kaspanet.io)** and paste your testnet address (starts with `kaspatest:`) to receive free test KAS.

> Testnet addresses start with `kaspatest:` not `kaspa:` — make sure your wallet is on testnet-10 before copying the address.

**3. Register as a merchant**

Go to [kasgate-production.up.railway.app/dashboard/register](https://kasgate-production.up.railway.app/dashboard/register):
- Enter your name and email
- Paste your xPub key
- Submit — your account is created and your API key is shown on the dashboard

Keep your API key safe. You can regenerate it from the dashboard if needed.

---

### Part 2: Test a payment from the terminal

This is the fastest way to see the full flow without building a frontend.

**1. Create a payment session**

```bash
curl -X POST https://kasgate-production.up.railway.app/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"amount": "1", "orderId": "test_001"}'
```

Response:
```json
{
  "id": "sess_abc123",
  "address": "kaspatest:qr...",
  "amount": "1",
  "status": "pending",
  "expiresAt": "2024-01-01T12:10:00Z"
}
```

**2. Send KAS to the generated address**

Open Kaspa-NG or KasWare, send exactly `1 KAS` (testnet) to the `address` from the response. The address is unique to this payment session.

**3. Poll for confirmation**

```bash
curl https://kasgate-production.up.railway.app/api/v1/sessions/sess_abc123 \
  -H "X-API-Key: YOUR_API_KEY"
```

Run this every 10–15 seconds. Status moves from `pending` → `confirmed` once the transaction is picked up on-chain. Testnet-10 confirms in under a minute.

**4. Check the dashboard**

Open the [dashboard](https://kasgate-production.up.railway.app/dashboard) — you'll see the session appear under **Sessions** with its status updating in real time.

---

### Part 3: Integrate into your app

**Option A — REST API**

Add payment creation to your backend:

```javascript
// Create a payment session when a user checks out
const response = await fetch('https://kasgate-production.up.railway.app/api/v1/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.KASGATE_API_KEY
  },
  body: JSON.stringify({
    amount: '10.5',         // Amount in KAS
    orderId: 'order_123'    // Your internal order ID
  })
});

const session = await response.json();

// Show session.address to your user — they send payment here
// Store session.id to poll status or match with webhook
```

Listen for payment confirmation via webhook:

```javascript
app.post('/webhook/kaspa', express.raw({ type: 'application/json' }), (req, res) => {
  // Verify the signature
  const signature = req.headers['x-kasgate-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.KASGATE_WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  const { event, sessionId, txId, amount } = JSON.parse(req.body);

  if (event === 'payment.confirmed') {
    // Payment received — fulfill the order
    console.log(`Order fulfilled. TX: ${txId}, Amount: ${amount} KAS`);
    fulfillOrder(sessionId);
  }

  res.status(200).send('OK');
});
```

Register your webhook URL from the dashboard under **Settings → Webhook**.

**Option B — Drop-in widget (no backend needed)**

Add a payment button to any webpage in 3 lines:

```html
<script src="https://kasgate-production.up.railway.app/widget/kasgate.js"></script>
<kas-gate
  api-key="your_api_key"
  amount="10.5"
  order-id="order_123"
  theme="dark"
></kas-gate>
```

The widget handles the full payment UI — shows the address, QR code, and confirms when payment arrives.

---

### Checking webhook delivery

Every webhook attempt is logged. Go to **Dashboard → Webhook Logs** to see:
- Which events fired
- The payload sent
- Your server's response code
- Failed deliveries (KasGate retries automatically)

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
