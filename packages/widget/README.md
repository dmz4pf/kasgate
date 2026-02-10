# @kasgate/widget

Embeddable Kaspa payment widget for accepting KAS payments on any website.

## Features

- **Zero dependencies** - Self-contained web component
- **Multiple integration methods** - Script tag, npm, or programmatic API
- **Real-time updates** - WebSocket-powered payment status
- **Wallet integration** - Native Kasware wallet support
- **Customizable themes** - Light/dark mode
- **TypeScript support** - Full type definitions included

## Installation

### CDN (Quickest)

```html
<script src="https://unpkg.com/@kasgate/widget@latest/dist/kasgate.umd.min.js"></script>
```

### npm / yarn / pnpm

```bash
npm install @kasgate/widget
# or
yarn add @kasgate/widget
# or
pnpm add @kasgate/widget
```

## Quick Start

### HTML (Script Tag)

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/@kasgate/widget"></script>
</head>
<body>
  <kas-gate
    merchant-id="your-merchant-id"
    amount="10.5"
    server-url="https://your-kasgate-server.com"
    api-key="your-api-key"
  ></kas-gate>
</body>
</html>
```

### JavaScript (Programmatic)

```javascript
import { createPayment } from '@kasgate/widget';

const widget = createPayment('#payment-container', {
  merchantId: 'your-merchant-id',
  amount: '10.5',
  serverUrl: 'https://your-kasgate-server.com',
  apiKey: 'your-api-key',
  orderId: 'ORDER-123',
  theme: 'light',
  onStateChange: (state, session) => {
    console.log('State:', state);
  },
  onPaymentConfirmed: (session) => {
    console.log('Payment confirmed!', session);
  },
});
```

### Modal Mode

```javascript
import { openModal } from '@kasgate/widget';

const { element, close } = openModal({
  merchantId: 'your-merchant-id',
  amount: '25.5',
  serverUrl: 'https://your-kasgate-server.com',
  apiKey: 'your-api-key',
});

// Modal auto-closes 3s after confirmation
// Or manually: close();
```

## Configuration

| Attribute/Option | Type | Required | Description |
|-----------------|------|----------|-------------|
| `merchantId` / `merchant-id` | string | Yes | Your KasGate merchant ID |
| `amount` | string | Yes | Payment amount in KAS |
| `serverUrl` / `server-url` | string | Yes | Your KasGate server URL |
| `apiKey` / `api-key` | string | Yes | Your merchant API key |
| `orderId` / `order-id` | string | No | Your internal order reference |
| `theme` | `'light'` \| `'dark'` | No | Widget theme (default: `'light'`) |
| `onStateChange` | function | No | Callback for state changes |
| `onPaymentConfirmed` | function | No | Callback when payment confirms |
| `onError` | function | No | Callback for errors |

## Payment States

| State | Description |
|-------|-------------|
| `initializing` | Creating payment session |
| `awaiting_payment` | Displaying address, waiting for payment |
| `confirming` | Payment detected, awaiting confirmations |
| `confirmed` | Payment fully confirmed |
| `expired` | Session expired without payment |
| `error` | An error occurred |

## Events

Listen for custom events on the element:

```javascript
const widget = document.querySelector('kas-gate');

widget.addEventListener('statechange', (e) => {
  console.log('State:', e.detail.state);
  console.log('Session:', e.detail.session);
});

widget.addEventListener('paymentconfirmed', (e) => {
  console.log('Confirmed!', e.detail.session);
});

widget.addEventListener('error', (e) => {
  console.error('Error:', e.detail.error);
});
```

## Programmatic API

```javascript
const widget = document.querySelector('kas-gate');

// Get current state
const state = widget.getState();

// Get session data
const session = widget.getSession();

// Reset widget for new payment
widget.reset();
```

## Utilities

Helpful conversion functions included:

```javascript
import { sompiToKas, kasToSompi, isKaswareInstalled } from '@kasgate/widget';

// Convert sompi to KAS (1 KAS = 100,000,000 sompi)
sompiToKas(100000000n);  // '1'
sompiToKas(150000000n);  // '1.5'
sompiToKas(1n);          // '0.00000001'

// Convert KAS to sompi
kasToSompi('1');         // 100000000n
kasToSompi('1.5');       // 150000000n
kasToSompi('0.00000001'); // 1n

// Check for Kasware wallet
if (isKaswareInstalled()) {
  console.log('Kasware wallet available');
}
```

## Kasware Wallet Integration

If Kasware is installed, the widget shows a "Pay with Kasware" button. You can also use the integration directly:

```javascript
import { KaswareIntegration, isKaswareInstalled } from '@kasgate/widget';

if (isKaswareInstalled()) {
  const kasware = new KaswareIntegration();

  // Connect wallet
  const accounts = await kasware.connect();
  console.log('Connected:', accounts[0]);

  // Send payment
  const txId = await kasware.sendPayment(
    'kaspa:qr0...destination',
    100000000n // amount in sompi
  );
  console.log('Transaction:', txId);
}
```

## TypeScript

Full type definitions included:

```typescript
import type {
  KasGateConfig,
  WidgetState,
  SessionResponse,
} from '@kasgate/widget';

const config: KasGateConfig = {
  merchantId: 'merchant-id',
  amount: '10',
  serverUrl: 'https://server.com',
  apiKey: 'key',
  onPaymentConfirmed: (session: SessionResponse) => {
    console.log(session.id, session.status);
  },
};
```

## Styling

The widget uses Shadow DOM. Customize with CSS custom properties:

```css
kas-gate {
  --kg-primary: #49eacb;
  --kg-background: #ffffff;
  --kg-text: #1a1a2e;
  --kg-border: #e5e5e5;
  --kg-success: #22c55e;
  --kg-warning: #f59e0b;
  --kg-error: #ef4444;
}
```

## Framework Examples

### React

```jsx
import { useEffect, useRef } from 'react';
import { createPayment } from '@kasgate/widget';

function PaymentWidget({ amount, orderId, onSuccess }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const widget = createPayment(containerRef.current, {
      merchantId: process.env.REACT_APP_MERCHANT_ID,
      amount,
      serverUrl: process.env.REACT_APP_KASGATE_URL,
      apiKey: process.env.REACT_APP_API_KEY,
      orderId,
      onPaymentConfirmed: onSuccess,
    });

    return () => widget.remove();
  }, [amount, orderId, onSuccess]);

  return <div ref={containerRef} />;
}
```

### Vue 3

```vue
<template>
  <div ref="container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { createPayment } from '@kasgate/widget';

const props = defineProps(['amount', 'orderId']);
const emit = defineEmits(['confirmed']);

const container = ref(null);
let widget = null;

onMounted(() => {
  widget = createPayment(container.value, {
    merchantId: import.meta.env.VITE_MERCHANT_ID,
    amount: props.amount,
    serverUrl: import.meta.env.VITE_KASGATE_URL,
    apiKey: import.meta.env.VITE_API_KEY,
    orderId: props.orderId,
    onPaymentConfirmed: (session) => emit('confirmed', session),
  });
});

onUnmounted(() => widget?.remove());
</script>
```

### Next.js (App Router)

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { KasGateElement } from '@kasgate/widget';

export default function Payment({ amount }: { amount: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamic import for client-side only
    import('@kasgate/widget').then(({ createPayment }) => {
      createPayment(containerRef.current!, {
        merchantId: process.env.NEXT_PUBLIC_MERCHANT_ID!,
        amount,
        serverUrl: process.env.NEXT_PUBLIC_KASGATE_URL!,
        apiKey: process.env.NEXT_PUBLIC_API_KEY!,
      });
    });
  }, [amount]);

  return <div ref={containerRef} />;
}
```

## Browser Support

- Chrome 67+
- Firefox 63+
- Safari 10.1+
- Edge 79+

Requires:
- Custom Elements v1
- Shadow DOM v1
- ES2020 features (BigInt, optional chaining)

## Build Formats

| Format | File | Use Case |
|--------|------|----------|
| UMD | `kasgate.umd.js` | Script tag in browsers |
| UMD (minified) | `kasgate.umd.min.js` | Production script tag |
| ESM | `kasgate.esm.js` | Modern bundlers (Vite, Webpack 5+) |
| CJS | `kasgate.cjs.js` | Node.js / SSR |

## License

MIT
