import { useState } from 'react';
import { Eye, EyeOff, Copy, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useMerchant,
  useUpdateMerchant,
  useRegenerateApiKey,
  useRegenerateWebhookSecret,
} from '@/hooks/useMerchant';
import { useAuthStore } from '@/stores/authStore';
import { copyToClipboard } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

export function SettingsPage() {
  const { data: merchant, isLoading } = useMerchant();
  const updateMerchant = useUpdateMerchant();
  const regenerateApiKey = useRegenerateApiKey();
  const regenerateSecret = useRegenerateWebhookSecret();
  const { apiKey } = useAuthStore();

  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleStartEdit = () => {
    setBusinessName(merchant?.businessName ?? '');
    setWebhookUrl(merchant?.webhookUrl ?? '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateMerchant.mutateAsync({
      businessName,
      webhookUrl: webhookUrl || undefined,
    });
    setIsEditing(false);
  };

  const handleRegenerateApiKey = async () => {
    if (
      window.confirm(
        'Are you sure? The current API key will be invalidated immediately.'
      )
    ) {
      const result = await regenerateApiKey.mutateAsync();
      setNewApiKey(result.apiKey);
    }
  };

  const handleRegenerateSecret = async () => {
    if (window.confirm('Are you sure you want to regenerate the webhook secret?')) {
      const result = await regenerateSecret.mutateAsync();
      setNewSecret(result.webhookSecret);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    await copyToClipboard(text);
    toast('success', `${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <Skeleton className="h-48 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#e5e7eb]">Settings</h1>
        <p className="text-[#9ca3af] mt-1">Manage your account settings</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your merchant account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Business Name
                </label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#9ca3af] mb-2">
                  Webhook URL
                </label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} isLoading={updateMerchant.isPending}>
                  Save
                </Button>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-[#9ca3af]">Email</span>
                <span className="text-[#e5e7eb]">{merchant?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9ca3af]">Business Name</span>
                <span className="text-[#e5e7eb]">{merchant?.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9ca3af]">Webhook URL</span>
                <span className="text-[#e5e7eb]">
                  {merchant?.webhookUrl || 'Not set'}
                </span>
              </div>
              <Button variant="secondary" onClick={handleStartEdit}>
                Edit Profile
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>
            Use this key to authenticate API requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newApiKey ? (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-500 mb-2">
                New API key generated. Copy it now - it won't be shown again!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#0A0F14] rounded px-3 py-2 text-sm font-mono text-[#e5e7eb] overflow-x-auto">
                  {newApiKey}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(newApiKey, 'API key')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-[#0A0F14] rounded-lg px-4 py-2 font-mono text-sm">
                {showApiKey ? apiKey : `kg_${'•'.repeat(24)}...${merchant?.apiKeyLastFour}`}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(apiKey!, 'API key')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={handleRegenerateApiKey}
            isLoading={regenerateApiKey.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate API Key
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Secret */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Secret</CardTitle>
          <CardDescription>
            Use this secret to verify webhook signatures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newSecret && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-500 mb-2">
                New webhook secret generated. Copy it now!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#0A0F14] rounded px-3 py-2 text-sm font-mono text-[#e5e7eb] overflow-x-auto">
                  {newSecret}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(newSecret, 'Webhook secret')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            onClick={handleRegenerateSecret}
            isLoading={regenerateSecret.isPending}
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate Webhook Secret
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
