import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Copy, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

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
  const [showAdvanced, setShowAdvanced] = useState(false);

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
        name: registrationResult.name,
        email: registrationResult.email ?? '',
        webhookUrl: registrationResult.webhookUrl,
        createdAt: registrationResult.createdAt,
      });
      navigate('/', { replace: true });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast('success', `${label} copied to clipboard`);
  };

  if (registrationResult) {
    return (
      <div className="min-h-screen bg-zn-bg flex items-center justify-center p-4 relative">
        <div className="bg-ambient" />
        <div className="w-full max-w-lg relative z-[1]">
          <div className="bg-zn-surface/70 backdrop-blur-xl rounded-2xl border border-zn-border p-10">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-zn-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-zn-success" />
              </div>
              <h2 className="text-xl font-semibold text-gradient mb-1">Account Created!</h2>
              <p className="text-sm text-zn-secondary">
                Save these keys somewhere safe — you won't be able to see them again after leaving this page.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-zn-alt border border-zn-border rounded-lg p-4">
                <label className="block text-sm font-medium text-zn-text mb-2">Your API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-zn-link text-sm break-all font-mono">{registrationResult.apiKey}</code>
                  <button
                    onClick={() => copyToClipboard(registrationResult.apiKey, 'API Key')}
                    className="shrink-0 p-1.5 rounded bg-zn-surface border border-zn-border text-zn-muted hover:text-zn-text transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-zn-alt border border-zn-border rounded-lg p-4">
                <label className="block text-sm font-medium text-zn-text mb-2">Notification Secret</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-zn-link text-sm break-all font-mono">{registrationResult.webhookSecret}</code>
                  <button
                    onClick={() => copyToClipboard(registrationResult.webhookSecret, 'Webhook Secret')}
                    className="shrink-0 p-1.5 rounded bg-zn-surface border border-zn-border text-zn-muted hover:text-zn-text transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="bg-zn-warning/10 border border-zn-warning/30 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-zn-warning shrink-0 mt-0.5" />
                <p className="text-sm text-zn-warning">
                  Keep these keys private and secure. If you lose them, you can generate new ones in Settings.
                </p>
              </div>

              <Button onClick={handleContinue} size="lg" className="w-full mt-2">
                Continue to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zn-bg flex items-center justify-center p-4 relative">
      <div className="bg-ambient" />
      <div className="w-full max-w-[400px] relative z-[1]">
        <div className="bg-zn-surface/70 backdrop-blur-xl rounded-2xl border border-zn-border p-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-[10px] overflow-hidden mb-6 shadow-lg shadow-zn-accent/20">
              <img src="/logo.png" alt="KasGate" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-semibold text-gradient mb-1">Create Merchant Account</h2>
            <p className="text-sm text-zn-secondary mb-6">Register to start accepting Kaspa payments</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {errors.form && (
              <div className="bg-zn-error/10 border border-zn-error/30 rounded-lg p-3 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-zn-error shrink-0 mt-0.5" />
                <p className="text-sm text-zn-error">{errors.form}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zn-text mb-1.5">
                Business Name <span className="text-zn-error">*</span>
              </label>
              <Input
                id="name"
                placeholder="My Online Store"
                value={formData.name}
                onChange={handleChange('name')}
                error={errors.name}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zn-text mb-1.5">
                Email <span className="text-zn-muted text-xs">(optional)</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="merchant@example.com"
                value={formData.email}
                onChange={handleChange('email')}
                error={errors.email}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zn-text mb-1.5">
                Kaspa Wallet Key (xPub) <span className="text-zn-error">*</span>
              </label>
              <textarea
                id="xpub"
                placeholder="kpub..."
                value={formData.xpub}
                onChange={handleChange('xpub')}
                disabled={isLoading}
                rows={3}
                className={cn(
                  'w-full rounded-md px-3 py-2.5 text-sm font-mono',
                  'bg-zn-alt border border-zn-border text-zn-text placeholder:text-zn-muted',
                  'focus:outline-none focus:ring-2 focus:ring-zn-accent focus:border-transparent resize-none',
                  errors.xpub && 'border-zn-error focus:ring-zn-error focus:border-transparent'
                )}
              />
              {errors.xpub && <p className="mt-1.5 text-xs text-zn-error">{errors.xpub}</p>}
              {!errors.xpub && (
                <p className="mt-1.5 text-xs text-zn-secondary">
                  This key lets KasGate create unique payment addresses for each customer.
                </p>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-sm font-medium text-zn-secondary hover:text-zn-text transition-colors"
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAdvanced && 'rotate-180')} />
                Notification settings
              </button>
              {showAdvanced && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-zn-text mb-1.5">Webhook URL</label>
                  <Input
                    id="webhookUrl"
                    type="url"
                    placeholder="https://mysite.com/webhook"
                    value={formData.webhookUrl}
                    onChange={handleChange('webhookUrl')}
                    error={errors.webhookUrl}
                    disabled={isLoading}
                  />
                  {!errors.webhookUrl && (
                    <p className="mt-1.5 text-xs text-zn-secondary">
                      We'll notify your server when payments are received, confirmed, or expire.
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={!formData.name.trim() || !formData.xpub.trim() || isLoading}
              isLoading={isLoading}
              className="w-full mt-1"
            >
              Create Account
            </Button>
          </form>

          <div className="border-t border-zn-border mt-6 pt-5">
            <p className="text-sm text-zn-secondary text-center">
              Already have an API key?{' '}
              <Link to="/login" className="text-zn-link font-medium hover:text-zn-link/80">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
