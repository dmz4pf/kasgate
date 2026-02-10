import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Key } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

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
      // Temporarily set the API key to verify it
      storeApiKey(apiKey);

      const merchant = await api.verifyApiKey(apiKey);
      setMerchant(merchant);
      toast('success', `Welcome, ${merchant.businessName}!`);
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
    <div className="min-h-screen bg-[#0A0F14] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-[#49EACB]/10 flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-[#49EACB] flex items-center justify-center">
              <span className="text-[#0A0F14] font-bold text-xl">K</span>
            </div>
          </div>
          <CardTitle className="text-2xl">KasGate Dashboard</CardTitle>
          <CardDescription>
            Enter your API key to access the merchant dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-[#9ca3af] mb-2">
                API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="kg_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  error={error}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={!apiKey.trim()}
            >
              Sign In
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#9ca3af]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#49EACB] hover:underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
