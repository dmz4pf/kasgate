import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/Toast';

interface RegisterResponse {
  id: string;
  name: string;
  email?: string;
  apiKey: string;
  webhookUrl?: string;
  webhookSecret: string;
  createdAt: string;
}

export function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    xpub: '',
    webhookUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registrationResult, setRegistrationResult] = useState<RegisterResponse | null>(null);

  const navigate = useNavigate();
  const { setApiKey, setMerchant } = useAuthStore();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Business name is required';
    if (!formData.xpub.trim()) newErrors.xpub = 'xPub key is required';
    if (formData.xpub && !formData.xpub.match(/^(xpub|kpub)[a-zA-Z0-9]{90,130}$/)) {
      newErrors.xpub = 'Invalid xPub format (should start with xpub or kpub)';
    }
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.webhookUrl && !formData.webhookUrl.match(/^https?:\/\/.+/)) {
      newErrors.webhookUrl = 'Invalid URL format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || undefined,
          xpub: formData.xpub,
          webhookUrl: formData.webhookUrl || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const result: RegisterResponse = await response.json();
      setRegistrationResult(result);
      toast('success', 'Registration successful! Save your API key.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      toast('error', message);
      setErrors({ form: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (registrationResult) {
      setApiKey(registrationResult.apiKey);
      setMerchant({
        id: registrationResult.id,
        businessName: registrationResult.name,
        email: registrationResult.email ?? '',
        webhookUrl: registrationResult.webhookUrl,
        apiKeyLastFour: registrationResult.apiKey.slice(-4),
        createdAt: registrationResult.createdAt,
      });
      navigate('/', { replace: true });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast('success', `${label} copied to clipboard`);
  };

  // Success screen
  if (registrationResult) {
    return (
      <div className="min-h-screen bg-[#0A0F14] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-center text-2xl text-green-500">Registration Complete!</CardTitle>
            <CardDescription className="text-center">
              Save these credentials securely. You won't be able to see them again.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-[#0A0F14] border border-[#2a3441]">
              <label className="block text-sm font-medium text-[#9ca3af] mb-2">API Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[#49EACB] text-sm break-all">{registrationResult.apiKey}</code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyToClipboard(registrationResult.apiKey, 'API Key')}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#0A0F14] border border-[#2a3441]">
              <label className="block text-sm font-medium text-[#9ca3af] mb-2">Webhook Secret</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[#49EACB] text-sm break-all">{registrationResult.webhookSecret}</code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyToClipboard(registrationResult.webhookSecret, 'Webhook Secret')}
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm text-yellow-500">
                Store these credentials in a safe place. If lost, you'll need to regenerate them.
              </p>
            </div>

            <Button onClick={handleContinue} className="w-full mt-4">
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F14] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#49EACB]/10 flex items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-[#49EACB] flex items-center justify-center">
                <span className="text-[#0A0F14] font-bold text-xl">K</span>
              </div>
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Create Merchant Account</CardTitle>
          <CardDescription className="text-center">
            Register to start accepting Kaspa payments
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.form && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {errors.form}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#9ca3af] mb-2">
                Business Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="name"
                placeholder="My Online Store"
                value={formData.name}
                onChange={handleChange('name')}
                error={errors.name}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#9ca3af] mb-2">
                Email <span className="text-[#6b7280]">(optional)</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="merchant@example.com"
                value={formData.email}
                onChange={handleChange('email')}
                error={errors.email}
              />
            </div>

            <div>
              <label htmlFor="xpub" className="block text-sm font-medium text-[#9ca3af] mb-2">
                Extended Public Key (xPub) <span className="text-red-400">*</span>
              </label>
              <textarea
                id="xpub"
                placeholder="kpub..."
                value={formData.xpub}
                onChange={handleChange('xpub')}
                className={`w-full px-4 py-3 rounded-lg bg-[#0A0F14] border text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#49EACB]/50 resize-none h-20 text-sm font-mono ${
                  errors.xpub ? 'border-red-500' : 'border-[#2a3441]'
                }`}
              />
              {errors.xpub && <p className="mt-1 text-sm text-red-500">{errors.xpub}</p>}
              <p className="mt-1.5 text-xs text-[#6b7280]">
                Your xPub key from a Kaspa wallet. Used to derive unique payment addresses.
              </p>
            </div>

            <div>
              <label htmlFor="webhookUrl" className="block text-sm font-medium text-[#9ca3af] mb-2">
                Webhook URL <span className="text-[#6b7280]">(optional)</span>
              </label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://mysite.com/webhook"
                value={formData.webhookUrl}
                onChange={handleChange('webhookUrl')}
                error={errors.webhookUrl}
              />
              <p className="mt-1.5 text-xs text-[#6b7280]">
                We'll send payment notifications to this URL.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={!formData.name.trim() || !formData.xpub.trim()}
            >
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#9ca3af]">
            Already have an API key?{' '}
            <Link to="/login" className="text-[#49EACB] hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
