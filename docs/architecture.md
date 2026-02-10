# KasGate Architecture Documentation

This document describes the system architecture, data flows, and design decisions in KasGate.

## Table of Contents

- [System Overview](#system-overview)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Key Design Decisions](#key-design-decisions)
- [Database Schema](#database-schema)
- [WebSocket Communication](#websocket-communication)
- [Integration Patterns](#integration-patterns)

---

## System Overview

KasGate is a self-hosted Kaspa payment gateway consisting of:

```
┌─────────────────────────────────────────────────────────────────┐
│                         KasGate Server                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Express   │  │  WebSocket  │  │   Payment   │             │
│  │     API     │  │   Server    │  │   Monitor   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                   ┌──────┴──────┐                               │
│                   │   SQLite    │                               │
│                   │  Database   │                               │
│                   └─────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
        │                  │                   │
        ▼                  ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Merchant    │  │  Payment      │  │  Kaspa        │
│   Dashboard   │  │  Widget       │  │  Network      │
│   (React)     │  │  (Embedded)   │  │  (RPC/REST)   │
└───────────────┘  └───────────────┘  └───────────────┘
```

### Core Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Server | Express.js | REST API for merchants and sessions |
| WebSocket Server | Socket.io | Real-time payment status updates |
| Payment Monitor | Custom | Watches addresses for incoming payments |
| Confirmation Tracker | Custom | Tracks transaction confirmations |
| Widget | Web Component | Embeddable payment UI |
| Dashboard | React + Vite | Merchant management interface |
| Database | SQLite + Drizzle | Persistent storage |

---

## Component Architecture

### Server Components

```
src/server/
├── index.ts              # Entry point, server startup
├── app.ts                # Express app configuration
├── routes/
│   ├── health.ts         # Health check endpoints
│   ├── merchants.ts      # Merchant CRUD operations
│   └── sessions.ts       # Payment session management
├── services/
│   ├── merchant.ts       # Merchant business logic
│   ├── session.ts        # Session management
│   ├── payment-monitor.ts # Address monitoring
│   ├── confirmation.ts   # TX confirmation tracking
│   └── webhook.ts        # Webhook delivery
├── middleware/
│   ├── auth.ts           # API key authentication
│   ├── validation.ts     # Request validation
│   └── error.ts          # Error handling
├── websocket/
│   └── index.ts          # WebSocket server
└── db/
    ├── index.ts          # Database connection
    └── schema.ts         # Table definitions
```

### Widget Components

```
src/widget/
├── index.ts              # Entry point, registration
├── KasGateElement.ts     # Web component implementation
├── styles/
│   └── base.ts           # CSS-in-JS styles
└── utils/
    └── formatters.ts     # Display formatting
```

### Dashboard Components

```
dashboard/src/
├── App.tsx               # Root component, routing
├── pages/
│   ├── Login.tsx         # Authentication
│   ├── Register.tsx      # Merchant registration
│   ├── Dashboard.tsx     # Overview stats
│   ├── Sessions.tsx      # Session list
│   ├── SessionDetail.tsx # Single session view
│   ├── Settings.tsx      # Merchant settings
│   └── Integration.tsx   # API docs, code snippets
├── components/
│   ├── Layout.tsx        # Page layout
│   ├── Sidebar.tsx       # Navigation
│   └── ...               # UI components
└── lib/
    └── api.ts            # API client
```

---

## Data Flow

### Payment Session Lifecycle

```
                                    ┌─────────────┐
                                    │   Merchant  │
                                    │   Server    │
                                    └──────┬──────┘
                                           │
                    1. POST /sessions      │
                       {amount, orderId}   │
                                           ▼
┌─────────────┐                    ┌─────────────┐
│   Customer  │                    │   KasGate   │
│   Browser   │◄───────────────────│   Server    │
└──────┬──────┘  2. Session +      └──────┬──────┘
       │            Address               │
       │                                  │
       │  3. Display payment UI           │  4. Monitor address
       │     (widget or custom)           │     (RPC subscription)
       ▼                                  ▼
┌─────────────┐                    ┌─────────────┐
│   Kasware   │   5. Send KAS      │   Kaspa     │
│   Wallet    │───────────────────►│   Network   │
└─────────────┘                    └──────┬──────┘
                                          │
                    6. UTXO detected       │
                                          ▼
                                   ┌─────────────┐
                                   │   KasGate   │
                                   │   Server    │
                                   └──────┬──────┘
                                          │
                    7. status: confirming  │
                       (0 confirmations)   │
                                          ▼
                                   ┌─────────────┐
                                   │  WebSocket  │──► Browser
                                   │  + Webhook  │──► Merchant
                                   └──────┬──────┘
                                          │
                    8. Track confirmations │
                       (0 → 10)            │
                                          ▼
                    9. status: confirmed   │
                       (10 confirmations)  │
                                          ▼
                                   ┌─────────────┐
                                   │  Webhook    │
                                   │  Delivery   │
                                   └─────────────┘
```

### State Transitions

```
                  ┌──────────┐
                  │ CREATED  │
                  └────┬─────┘
                       │
                       ▼
   ┌───────────────────────────────────┐
   │              PENDING              │
   │   (waiting for payment)           │
   └───────┬───────────────────┬───────┘
           │                   │
    Payment received    Timeout (30 min)
           │                   │
           ▼                   ▼
   ┌───────────────┐   ┌───────────────┐
   │  CONFIRMING   │   │   EXPIRED     │
   │ (0-9 blocks)  │   │               │
   └───────┬───────┘   └───────────────┘
           │
    10 confirmations
           │
           ▼
   ┌───────────────┐
   │  CONFIRMED    │
   │               │
   └───────────────┘
```

---

## Key Design Decisions

### 1. HD Wallet Address Derivation

**Decision:** Use Hierarchical Deterministic (HD) wallets for address generation.

**Why:**
- Each payment gets a unique address (privacy, tracking)
- No private key storage required (only xPub)
- Merchant controls funds directly
- Supports offline address generation

**Implementation:**
```javascript
// Derive address at index N from merchant's xPub
const address = deriveAddress(merchant.xpub, index);
// Atomic increment of index in database
merchant.nextAddressIndex++;
```

### 2. Payment Agnostic Design

**Decision:** Don't require wallet-specific integration in the widget.

**Why:**
- Works with any Kaspa wallet (Kasware, KDX, hardware, etc.)
- Customer chooses their preferred wallet
- Simple QR code / address copy UX
- Optional Kasware deep-link for convenience

### 3. WebSocket for Real-time Updates

**Decision:** Use WebSocket + short polling fallback.

**Why:**
- Instant payment detection notification
- Better UX than polling-only
- Token-based subscription (no API key in browser)
- Fallback to polling if WebSocket fails

### 4. SQLite Database

**Decision:** Use SQLite instead of PostgreSQL/MySQL.

**Why:**
- Zero configuration deployment
- Single-file database (easy backup)
- Sufficient performance for most use cases
- No external dependencies

**Tradeoffs:**
- Single-writer limitation (fine for expected load)
- No built-in replication (use file-level backup)

### 5. Webhook Retry with Exponential Backoff

**Decision:** Retry failed webhooks up to 5 times with exponential backoff.

**Why:**
- Handle temporary merchant server issues
- Prevent webhook storms
- Idempotency via delivery ID

**Schedule:**
| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 second |
| 3 | 2 seconds |
| 4 | 4 seconds |
| 5 | 8 seconds |

### 6. Monolithic Architecture

**Decision:** Single deployable unit vs. microservices.

**Why:**
- Simpler deployment for self-hosted
- Lower operational complexity
- Adequate for payment gateway scale
- Easy to containerize

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│      merchants      │       │      sessions       │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ name                │       │ merchant_id (FK)────┼───┐
│ email (unique)      │       │ address             │   │
│ xpub                │       │ address_index       │   │
│ api_key_hash        │       │ amount              │   │
│ webhook_url         │       │ status              │   │
│ webhook_secret      │       │ tx_id               │   │
│ next_address_index  │       │ confirmations       │   │
│ created_at          │       │ order_id            │   │
│ updated_at          │◄──────│ metadata            │   │
└─────────────────────┘       │ expires_at          │   │
                              │ paid_at             │   │
                              │ confirmed_at        │   │
                              └─────────────────────┘   │
                                                        │
┌─────────────────────┐                                 │
│    webhook_logs     │                                 │
├─────────────────────┤                                 │
│ id (PK)             │                                 │
│ session_id (FK)─────┼─────────────────────────────────┘
│ event               │
│ payload             │
│ delivery_id         │
│ status_code         │
│ attempts            │
│ next_retry_at       │
│ delivered_at        │
└─────────────────────┘
```

### Table Details

**merchants**
- Primary storage for merchant accounts
- `api_key_hash` stores SHA-256 hash (never plaintext)
- `next_address_index` atomically incremented for address derivation

**sessions**
- One per payment request
- `address` is unique HD-derived address
- `subscription_token` for WebSocket authentication
- `metadata` stored as JSON string

**webhook_logs**
- Audit trail for all webhook deliveries
- `delivery_id` enables idempotency
- `next_retry_at` for retry scheduling

---

## WebSocket Communication

### Connection Flow

```
Client                                    Server
   │                                         │
   │──── Connect to /ws ────────────────────►│
   │                                         │
   │◄─── Connection established ─────────────│
   │                                         │
   │──── Subscribe {sessionId, token} ──────►│
   │                                         │
   │                    Validate token       │
   │                                         │
   │◄─── Subscribed to session ──────────────│
   │                                         │
   │          ... Payment detected ...       │
   │                                         │
   │◄─── Status update {confirming, 0} ──────│
   │                                         │
   │◄─── Status update {confirming, 5} ──────│
   │                                         │
   │◄─── Status update {confirmed, 10} ──────│
   │                                         │
```

### Message Types

**Client → Server:**
```json
{
  "type": "subscribe",
  "sessionId": "uuid",
  "token": "subscription_token"
}
```

**Server → Client:**
```json
{
  "type": "status",
  "sessionId": "uuid",
  "status": "confirming",
  "confirmations": 5
}
```

---

## Integration Patterns

### Server-side (Recommended)

```javascript
// 1. Create session from your server
const response = await fetch('https://kasgate.example.com/api/v1/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.KASGATE_API_KEY,
  },
  body: JSON.stringify({
    amount: '10.5',
    orderId: 'ORDER-123',
  }),
});

const session = await response.json();

// 2. Send session ID to client
// 3. Handle webhook for confirmation
```

### Client-side Widget

```html
<!-- Embed widget -->
<script src="https://kasgate.example.com/widget/kasgate.js"></script>

<kasgate-widget
  session-id="uuid-from-server"
  api-url="https://kasgate.example.com"
></kasgate-widget>
```

### Webhook Integration

```javascript
// Express webhook handler
app.post('/webhooks/kasgate', (req, res) => {
  // 1. Verify signature
  const signature = req.headers['x-kasgate-signature'];
  if (!verifySignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // 2. Check idempotency
  const deliveryId = req.body.deliveryId;
  if (await isProcessed(deliveryId)) {
    return res.status(200).send('Already processed');
  }

  // 3. Process event
  switch (req.body.event) {
    case 'payment.confirmed':
      await fulfillOrder(req.body.orderId);
      break;
    case 'payment.expired':
      await cancelOrder(req.body.orderId);
      break;
  }

  // 4. Mark as processed
  await markProcessed(deliveryId);

  res.status(200).send('OK');
});
```

---

## Performance Considerations

### Scaling Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| Concurrent sessions | ~10,000 | Limited by memory for monitors |
| Webhooks/second | ~100 | HTTP connection pool |
| WebSocket connections | ~5,000 | Per Node.js process |
| Database writes | ~1,000/sec | SQLite single-writer |

### Optimization Strategies

1. **Session cleanup**: Expired sessions can be archived
2. **Connection pooling**: Reuse Kaspa RPC connections
3. **Webhook batching**: Group confirmations (not implemented)
4. **Horizontal scaling**: Run multiple instances with shared DB (future)

---

## Future Considerations

### Potential Enhancements

1. **Multi-currency support** - Accept other Kaspa-based tokens
2. **Payment forwarding** - Auto-forward to cold wallet
3. **Analytics dashboard** - Revenue charts, conversion rates
4. **Multi-merchant mode** - SaaS deployment option
5. **PostgreSQL support** - For larger deployments
