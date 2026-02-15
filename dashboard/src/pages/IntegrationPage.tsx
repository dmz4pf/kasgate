import { useState } from 'react';
import { Copy, Check, Terminal, Code, Globe, Webhook, ArrowRight, Key, Zap, BookOpen } from 'lucide-react';
import { WidgetPreview } from '@/components/widget/WidgetPreview';
import { cn, copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { Link } from 'react-router-dom';

const TABS = ['JavaScript', 'Python', 'cURL'] as const;
type Tab = (typeof TABS)[number];

const CODE_EXAMPLES: Record<Tab, { create: string; webhook: string }> = {
  JavaScript: {
    create: `// 1. Create a payment session
const response = await fetch('https://kasgate-production.up.railway.app/api/v1/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    amount: '10.5',
    orderId: 'order_123',
    metadata: { customerId: 'cust_456' },
    redirectUrl: 'https://yoursite.com/payment-complete'
  })
});

const session = await response.json();
console.log(session.id);        // "sess_abc123"
console.log(session.address);   // "kaspatest:qr..."
console.log(session.amount);    // "10.5"
console.log(session.expiresAt); // "2026-02-15T..."`,
    webhook: `import crypto from 'crypto';
import express from 'express';

const app = express();

// IMPORTANT: Use express.raw() to get the raw body for signature verification
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-kasgate-signature'];
  const timestamp = req.headers['x-kasgate-timestamp'];
  const secret = process.env.WEBHOOK_SECRET;

  // Verify HMAC-SHA256 of raw body bytes (must match exactly)
  const expected = crypto
    .createHmac('sha256', secret)
    .update(req.body) // raw Buffer, not parsed JSON
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  // Check timestamp is within 5 minutes (replay protection)
  const age = Date.now() - new Date(timestamp).getTime();
  if (age > 5 * 60 * 1000) {
    return res.status(401).send('Timestamp too old');
  }

  // Now parse the verified body
  const { event, sessionId, amount, address, txId, orderId } = JSON.parse(req.body);

  switch (event) {
    case 'payment.confirmed':
      console.log('Payment confirmed:', sessionId, txId);
      // TODO: fulfill the order
      break;
    case 'payment.expired':
      console.log('Payment expired:', sessionId);
      // TODO: cancel or retry the order
      break;
  }

  res.status(200).send('OK');
});`,
  },
  Python: {
    create: `import requests

response = requests.post(
    'https://kasgate-production.up.railway.app/api/v1/sessions',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key'
    },
    json={
        'amount': '10.5',
        'orderId': 'order_123',
        'metadata': {'customerId': 'cust_456'},
        'redirectUrl': 'https://yoursite.com/payment-complete'
    }
)

session = response.json()
print(session['id'])        # "sess_abc123"
print(session['address'])   # "kaspatest:qr..."
print(session['amount'])    # "10.5"
print(session['expiresAt']) # "2026-02-15T..."`,
    webhook: `import hmac
import hashlib
import json
from flask import Flask, request

app = Flask(__name__)
WEBHOOK_SECRET = 'your_webhook_secret'

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-KasGate-Signature')
    timestamp = request.headers.get('X-KasGate-Timestamp')

    # Verify HMAC-SHA256 signature
    # KasGate signs JSON.stringify(payload) - use raw body to match
    raw_body = request.get_data(as_text=True)
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        raw_body.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature or '', expected):
        return 'Invalid signature', 401

    data = request.json

    if data['event'] == 'payment.confirmed':
        print(f"Payment confirmed: {data['sessionId']}, tx: {data['txId']}")

    elif data['event'] == 'payment.expired':
        print(f"Payment expired: {data['sessionId']}")

    return 'OK', 200`,
  },
  cURL: {
    create: `# Create a payment session
curl -X POST https://kasgate-production.up.railway.app/api/v1/sessions \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key" \\
  -d '{
    "amount": "10.5",
    "orderId": "order_123",
    "metadata": { "customerId": "cust_456" },
    "redirectUrl": "https://yoursite.com/payment-complete"
  }'`,
    webhook: `# Example webhook payload:
# POST https://yoursite.com/webhook
# Headers:
#   X-KasGate-Signature: <hmac-sha256-hex>
#   X-KasGate-Event: payment.confirmed
#   X-KasGate-Timestamp: 2026-02-15T10:00:00.000Z
#   X-KasGate-Delivery-Id: <uuid>
#   Content-Type: application/json

{
  "event": "payment.confirmed",
  "sessionId": "sess_abc123",
  "merchantId": "merch_xyz",
  "amount": "1050000000",
  "address": "kaspatest:qr...",
  "txId": "abc123def456...",
  "confirmations": 10,
  "orderId": "order_123",
  "metadata": { "customerId": "cust_456" },
  "timestamp": "2026-02-15T10:00:00.000Z",
  "deliveryId": "<uuid>"
}

# Verify: HMAC-SHA256(JSON.stringify(body), webhook_secret)
# == X-KasGate-Signature header
# Also check timestamp is within 5 minutes`,
  },
};

const tabIcons: Record<Tab, React.ComponentType<{ className?: string }>> = {
  JavaScript: Code,
  Python: Terminal,
  cURL: Terminal,
};

export function IntegrationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('JavaScript');

  return (
    <div className="space-y-10">
      {/* Quick Start */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-md bg-zn-alt flex items-center justify-center">
            <Zap className="h-[18px] w-[18px] text-zn-link" />
          </div>
          <h2 className="text-lg font-semibold text-zn-text">Quick Start — 3 Steps</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <QuickStartStep number={1} title="Get Your API Key" description="Find your API key in Settings." link="/settings" linkLabel="Go to Settings" />
          <QuickStartStep number={2} title="Create a Payment" description="Send a request with amount and order ID. KasGate returns a unique Kaspa address." />
          <QuickStartStep number={3} title="Receive Payment Alerts" description="Set your notification URL in Settings." link="/settings" linkLabel="Set Notification URL" />
        </div>
      </div>

      {/* Language Tabs */}
      <div className="inline-flex gap-1 p-1 bg-zn-alt rounded-lg">
        {TABS.map((tab) => {
          const Icon = tabIcons[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex items-center gap-2 px-4 h-8 rounded-md text-sm font-medium',
                activeTab === tab ? 'bg-zn-accent/20 text-zn-accent' : 'text-zn-secondary hover:text-zn-text'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab}
            </button>
          );
        })}
      </div>

      {/* Create Session */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl overflow-hidden">
        <div className="px-6 py-6 border-b border-zn-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-zn-alt flex items-center justify-center">
              <Code className="h-[18px] w-[18px] text-zn-link" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zn-text">Step 1: Create a Payment</h2>
              <p className="text-sm text-zn-secondary mt-0.5">
                <code className="text-zn-link">POST /api/v1/sessions</code>
              </p>
            </div>
          </div>
        </div>
        <div className="p-6"><CodeBlock code={CODE_EXAMPLES[activeTab].create} /></div>
      </div>

      {/* Webhook */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl overflow-hidden">
        <div className="px-6 py-6 border-b border-zn-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zn-alt rounded-lg flex items-center justify-center">
              <Webhook className="h-[18px] w-[18px] text-zn-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zn-text">Step 2: Receive Payment Alerts</h2>
              <p className="text-sm text-zn-secondary mt-0.5">Verify the signature header</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <CodeBlock code={CODE_EXAMPLES[activeTab].webhook} />
          <div className="mt-6 p-4 rounded-lg bg-zn-alt border border-zn-border">
            <h3 className="text-sm font-medium text-zn-text mb-3">Payment Alert Types</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zn-muted" />
                <code className="text-zn-secondary">payment.pending</code>
                <span className="text-zn-secondary">— Waiting for customer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zn-warning" />
                <code className="text-zn-warning">payment.confirming</code>
                <span className="text-zn-secondary">— Detected on network</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zn-success" />
                <code className="text-zn-success">payment.confirmed</code>
                <span className="text-zn-secondary">— Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zn-error" />
                <code className="text-zn-error">payment.expired</code>
                <span className="text-zn-secondary">— Not paid in time</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zn-error" />
                <code className="text-zn-error">payment.failed</code>
                <span className="text-zn-secondary">— Payment error</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Widget */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl overflow-hidden">
        <div className="px-6 py-6 border-b border-zn-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zn-alt rounded-lg flex items-center justify-center">
              <Globe className="h-[18px] w-[18px] text-zn-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zn-text">Optional: Payment Widget</h2>
              <p className="text-sm text-zn-secondary mt-0.5">A ready-made payment form for your website</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <CodeBlock
              code={`<!-- Add to your checkout page -->
<script src="https://kasgate-production.up.railway.app/widget/kasgate.js"></script>

<kas-gate
  merchant-id="your_merchant_id"
  amount="10.5"
  api-key="your_api_key"
  server-url="https://kasgate-production.up.railway.app"
  order-id="order_123"
  theme="dark"
></kas-gate>

<script>
  // Listen for state changes
  const widget = document.querySelector('kas-gate');
  widget.addEventListener('statechange', (e) => {
    const { state, session } = e.detail;
    if (state === 'confirmed') {
      console.log('Paid!', session);
      window.location.href = '/order-complete';
    }
    if (state === 'expired') {
      alert('Payment session expired');
    }
  });
</script>`}
            />
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-zn-secondary text-center">Live Preview</p>
              <WidgetPreview theme="dark" />
            </div>
          </div>
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl overflow-hidden">
        <div className="px-6 py-6 border-b border-zn-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-zn-alt rounded-lg flex items-center justify-center">
              <BookOpen className="h-[18px] w-[18px] text-zn-secondary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zn-text">API Reference</h2>
              <p className="text-sm text-zn-secondary mt-0.5">All endpoints use <code className="text-zn-secondary">X-API-Key</code> header</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zn-surface border-b border-zn-border">
                <th className="text-left h-10 px-5 text-[11px] font-semibold text-zn-muted uppercase tracking-[0.05em]">Method</th>
                <th className="text-left h-10 px-5 text-[11px] font-semibold text-zn-muted uppercase tracking-[0.05em]">Endpoint</th>
                <th className="text-left h-10 px-5 text-[11px] font-semibold text-zn-muted uppercase tracking-[0.05em]">Description</th>
              </tr>
            </thead>
            <tbody>
              <ApiRow method="POST" endpoint="/api/v1/sessions" description="Create a new payment" />
              <ApiRow method="GET" endpoint="/api/v1/sessions/:id" description="Get payment status" />
              <ApiRow method="POST" endpoint="/api/v1/sessions/:id/cancel" description="Cancel a pending payment" />
              <ApiRow method="GET" endpoint="/api/v1/merchants/me" description="Get merchant profile" />
              <ApiRow method="PATCH" endpoint="/api/v1/merchants/me" description="Update profile" />
              <ApiRow method="GET" endpoint="/api/v1/merchants/me/sessions" description="List all payments" />
              <ApiRow method="GET" endpoint="/api/v1/merchants/me/stats" description="Get payment statistics" />
              <ApiRow method="GET" endpoint="/api/v1/merchants/me/analytics" description="Revenue analytics" />
              <ApiRow method="POST" endpoint="/api/v1/merchants/me/regenerate-api-key" description="Regenerate API key" />
              <ApiRow method="GET" endpoint="/api/v1/merchants/me/webhook-logs" description="View webhook delivery logs" isLast />
            </tbody>
          </table>
        </div>
      </div>

      {/* Help */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 bg-zn-alt rounded-lg flex items-center justify-center shrink-0">
            <Key className="h-[18px] w-[18px] text-zn-secondary" />
          </div>
          <div>
            <h3 className="font-semibold text-zn-text mb-1">Need your API keys?</h3>
            <p className="text-sm text-zn-secondary">
              Your API Key and Notification Secret are in{' '}
              <Link to="/settings" className="text-zn-link font-medium hover:text-zn-link">Settings</Link>.
              Check delivery status on the{' '}
              <Link to="/webhooks" className="text-zn-link font-medium hover:text-zn-link">Notifications page</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStartStep({ number, title, description, link, linkLabel }: {
  number: number; title: string; description: string; link?: string; linkLabel?: string;
}) {
  return (
    <div className="p-5 rounded-lg bg-zn-alt border border-zn-border">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-7 h-7 rounded-md bg-zn-alt flex items-center justify-center text-sm font-semibold text-zn-link">{number}</div>
        <h3 className="text-sm font-semibold text-zn-text">{title}</h3>
      </div>
      <p className="text-sm text-zn-secondary">{description}</p>
      {link && (
        <Link to={link} className="inline-flex items-center gap-1.5 text-sm text-zn-link hover:text-zn-link font-medium mt-3">
          {linkLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await copyToClipboard(code);
    setCopied(true);
    toast('success', 'Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-zn-alt rounded-lg p-5 overflow-x-auto text-sm text-zn-secondary font-mono border border-zn-border leading-relaxed">{code}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded bg-zn-surface border border-zn-border text-zn-muted hover:text-zn-text"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-zn-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ApiRow({ method, endpoint, description, isLast }: {
  method: string; endpoint: string; description: string; isLast?: boolean;
}) {
  const methodColors: Record<string, string> = {
    GET: 'bg-zn-success/20 text-zn-success',
    POST: 'bg-zn-link/20 text-zn-link',
    PUT: 'bg-zn-warning/20 text-zn-warning',
    PATCH: 'bg-zn-warning/20 text-zn-warning',
    DELETE: 'bg-zn-error/20 text-zn-error',
  };

  return (
    <tr className={cn('h-[52px]', !isLast && 'border-b border-zn-border')}>
      <td className="px-5">
        <span className={cn('px-2 py-0.5 rounded text-xs font-semibold uppercase', methodColors[method] || 'bg-zn-alt text-zn-secondary')}>
          {method}
        </span>
      </td>
      <td className="px-5 font-mono text-zn-link text-sm">{endpoint}</td>
      <td className="px-5 text-zn-secondary">{description}</td>
    </tr>
  );
}
