import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { cn, copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

const TABS = ['JavaScript', 'Python', 'cURL'] as const;
type Tab = (typeof TABS)[number];

const CODE_EXAMPLES: Record<Tab, { create: string; webhook: string }> = {
  JavaScript: {
    create: `const response = await fetch('https://api.kasgate.io/v1/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your_api_key'
  },
  body: JSON.stringify({
    orderId: 'order_123',
    amount: '10.00',
    currency: 'USD',
    metadata: { customerId: 'cust_456' }
  })
});

const session = await response.json();
console.log(session.paymentUrl);`,
    webhook: `import crypto from 'crypto';

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express.js example
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-kasgate-signature'];

  if (!verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  if (event.type === 'session.confirmed') {
    // Handle successful payment
    console.log('Payment confirmed:', event.session.id);
  }

  res.status(200).send('OK');
});`,
  },
  Python: {
    create: `import requests

response = requests.post(
    'https://api.kasgate.io/v1/sessions',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': 'your_api_key'
    },
    json={
        'orderId': 'order_123',
        'amount': '10.00',
        'currency': 'USD',
        'metadata': {'customerId': 'cust_456'}
    }
)

session = response.json()
print(session['paymentUrl'])`,
    webhook: `import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)

@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-KasGate-Signature')

    if not verify_webhook(request.data, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401

    event = request.json

    if event['type'] == 'session.confirmed':
        # Handle successful payment
        print(f"Payment confirmed: {event['session']['id']}")

    return 'OK', 200`,
  },
  cURL: {
    create: `curl -X POST https://api.kasgate.io/v1/sessions \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key" \\
  -d '{
    "orderId": "order_123",
    "amount": "10.00",
    "currency": "USD",
    "metadata": {"customerId": "cust_456"}
  }'`,
    webhook: `# Webhook payload example
{
  "type": "session.confirmed",
  "session": {
    "id": "sess_abc123",
    "orderId": "order_123",
    "status": "confirmed",
    "kaspaAmount": "100.50000000",
    "txHash": "abc123..."
  }
}

# Verify signature:
# 1. Get raw request body
# 2. Compute HMAC-SHA256 with your webhook secret
# 3. Compare with X-KasGate-Signature header`,
  },
};

export function IntegrationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('JavaScript');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e5e7eb]">Integration Guide</h1>
        <p className="text-[#9ca3af] mt-1">
          Learn how to integrate KasGate payments into your application
        </p>
      </div>

      {/* Language Tabs */}
      <div className="flex gap-2 border-b border-[#2a3444]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors -mb-px',
              activeTab === tab
                ? 'text-[#49EACB] border-b-2 border-[#49EACB]'
                : 'text-[#9ca3af] hover:text-[#e5e7eb]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Create Session */}
      <Card>
        <CardHeader>
          <CardTitle>Create a Payment Session</CardTitle>
          <CardDescription>
            Create a new payment session to accept Kaspa payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={CODE_EXAMPLES[activeTab].create} />
        </CardContent>
      </Card>

      {/* Webhook Verification */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Verification</CardTitle>
          <CardDescription>
            Verify webhook signatures to ensure requests are authentic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={CODE_EXAMPLES[activeTab].webhook} />
        </CardContent>
      </Card>

      {/* Widget Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Integration</CardTitle>
          <CardDescription>
            Embed the payment widget directly on your checkout page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`<!-- Add to your checkout page -->
<div id="kasgate-widget"></div>

<script src="https://cdn.kasgate.io/widget.js"></script>
<script>
  KasGate.init({
    sessionId: 'sess_abc123', // From create session response
    onSuccess: (session) => {
      console.log('Payment successful!', session);
      // Redirect to success page
    },
    onError: (error) => {
      console.error('Payment failed:', error);
    }
  });
</script>`}
          />
        </CardContent>
      </Card>

      {/* API Reference */}
      <Card>
        <CardHeader>
          <CardTitle>API Reference</CardTitle>
          <CardDescription>Key endpoints and their usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a3444]">
                  <th className="text-left py-2 text-[#9ca3af] font-medium">
                    Endpoint
                  </th>
                  <th className="text-left py-2 text-[#9ca3af] font-medium">
                    Method
                  </th>
                  <th className="text-left py-2 text-[#9ca3af] font-medium">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#2a3444]">
                  <td className="py-2 font-mono text-[#49EACB]">/v1/sessions</td>
                  <td className="py-2 text-[#e5e7eb]">POST</td>
                  <td className="py-2 text-[#9ca3af]">Create payment session</td>
                </tr>
                <tr className="border-b border-[#2a3444]">
                  <td className="py-2 font-mono text-[#49EACB]">
                    /v1/sessions/:id
                  </td>
                  <td className="py-2 text-[#e5e7eb]">GET</td>
                  <td className="py-2 text-[#9ca3af]">Get session details</td>
                </tr>
                <tr className="border-b border-[#2a3444]">
                  <td className="py-2 font-mono text-[#49EACB]">
                    /v1/sessions/:id/cancel
                  </td>
                  <td className="py-2 text-[#e5e7eb]">POST</td>
                  <td className="py-2 text-[#9ca3af]">Cancel pending session</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono text-[#49EACB]">
                    /v1/merchants/me
                  </td>
                  <td className="py-2 text-[#e5e7eb]">GET</td>
                  <td className="py-2 text-[#9ca3af]">Get merchant profile</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
      <pre className="bg-[#0A0F14] rounded-lg p-4 overflow-x-auto text-sm text-[#e5e7eb] font-mono">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-lg bg-[#151C28] border border-[#2a3444] text-[#9ca3af] hover:text-[#e5e7eb] opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
