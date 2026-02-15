import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Key } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { setApiKey: storeApiKey, setMerchant } = useAuthStore();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      storeApiKey(apiKey);
      const merchant = await api.verifyApiKey(apiKey);
      setMerchant(merchant);
      toast('success', `Welcome back, ${merchant.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid API key';
      setError(message);
      toast('error', message);
      useAuthStore.getState().logout();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zn-bg flex items-center justify-center p-4 relative">
      <div className="bg-ambient" />

      <div className="w-full max-w-[400px] relative z-[1]">
        <div className="bg-zn-surface/70 backdrop-blur-xl rounded-2xl border border-zn-border p-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-zn-accent to-zn-purple flex items-center justify-center mb-6 shadow-lg shadow-zn-accent/20">
              <span className="text-zn-bg font-bold text-base">K</span>
            </div>
            <h2 className="text-xl font-semibold text-gradient mb-1">Welcome to KasGate</h2>
            <p className="text-sm text-zn-secondary mb-6">Enter your API key to manage your Kaspa payments</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label htmlFor="apiKey" className="block text-sm font-medium text-zn-text mb-1.5">
                API Key
              </label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Paste your API key here"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                icon={<Key className="h-[18px] w-[18px]" />}
                error={error}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={!apiKey.trim() || isLoading}
              isLoading={isLoading}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          <div className="border-t border-zn-border mt-6 pt-5">
            <p className="text-sm text-zn-secondary text-center">
              Don't have an account?{' '}
              <Link to="/register" className="text-zn-link font-medium hover:text-zn-link/80">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
