import { useState } from 'react';
import { Eye, EyeOff, Copy, RefreshCw, Shield, User, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
  const [name, setName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<'apiKey' | 'secret' | null>(null);

  const handleStartEdit = () => {
    setName(merchant?.name ?? '');
    setWebhookUrl(merchant?.webhookUrl ?? '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateMerchant.mutateAsync({ name, webhookUrl: webhookUrl || undefined });
    setIsEditing(false);
  };

  const handleRegenerateApiKey = async () => {
    const result = await regenerateApiKey.mutateAsync();
    setNewApiKey(result.apiKey);
    setConfirmDialog(null);
  };

  const handleRegenerateSecret = async () => {
    const result = await regenerateSecret.mutateAsync();
    setNewSecret(result.webhookSecret);
    setConfirmDialog(null);
  };

  const handleCopy = async (text: string, label: string) => {
    await copyToClipboard(text);
    toast('success', `${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-10 w-40" />
        <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-6"><Skeleton className="h-48 w-full" /></div>
        <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl p-6"><Skeleton className="h-48 w-full" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Profile */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl">
        <div className="flex items-center gap-3 p-6 border-b border-zn-border-strong">
          <div className="w-9 h-9 bg-zn-alt rounded-lg flex items-center justify-center">
            <User className="h-[18px] w-[18px] text-zn-secondary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zn-text">Profile</h2>
            <p className="text-sm text-zn-secondary">Your merchant account information</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-zn-text mb-1.5">Business Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zn-text mb-1.5">Notification URL</label>
                <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://example.com/webhook" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} isLoading={updateMerchant.isPending}>Save Changes</Button>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              <SettingRow label="Email" value={merchant?.email || 'Not added yet'} />
              <SettingRow label="Business Name" value={merchant?.name || ''} />
              <SettingRow label="Notification URL" value={merchant?.webhookUrl || 'Not added yet'} />
              <div className="pt-2">
                <Button variant="secondary" onClick={handleStartEdit}>Edit Profile</Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* API Key */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl">
        <div className="flex items-center gap-3 p-6 border-b border-zn-border-strong">
          <div className="w-9 h-9 bg-zn-alt rounded-lg flex items-center justify-center">
            <Shield className="h-[18px] w-[18px] text-zn-secondary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zn-text">API Key</h2>
            <p className="text-sm text-zn-secondary">Use this key to connect your website or app</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {newApiKey ? (
            <div className="p-4 rounded-md bg-zn-success/10 border border-zn-success/30">
              <p className="text-sm text-zn-success mb-3 font-medium">New API key generated. Copy it now!</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zn-surface rounded-md px-4 py-2.5 text-sm font-mono text-zn-text border border-zn-border overflow-x-auto">{newApiKey}</code>
                <Button variant="secondary" size="sm" onClick={() => handleCopy(newApiKey, 'API key')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-zn-alt rounded-md px-4 py-3 font-mono text-sm text-zn-secondary border border-zn-border">
                {showApiKey ? apiKey : `kg_${'•'.repeat(28)}`}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleCopy(apiKey!, 'API key')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button variant="secondary" onClick={() => setConfirmDialog('apiKey')} isLoading={regenerateApiKey.isPending} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Regenerate API Key
          </Button>
        </div>
      </div>

      {/* Webhook Secret */}
      <div className="bg-zn-surface/70 backdrop-blur-xl border border-zn-border rounded-2xl">
        <div className="flex items-center gap-3 p-6 border-b border-zn-border-strong">
          <div className="w-9 h-9 bg-zn-alt rounded-lg flex items-center justify-center">
            <Webhook className="h-[18px] w-[18px] text-zn-secondary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zn-text">Notification Secret</h2>
            <p className="text-sm text-zn-secondary">Used to verify payment notifications are from KasGate</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {newSecret && (
            <div className="p-4 rounded-md bg-zn-success/10 border border-zn-success/30">
              <p className="text-sm text-zn-success mb-3 font-medium">New webhook secret generated. Copy it now!</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-zn-surface rounded-md px-4 py-2.5 text-sm font-mono text-zn-text border border-zn-border overflow-x-auto">{newSecret}</code>
                <Button variant="secondary" size="sm" onClick={() => handleCopy(newSecret, 'Webhook secret')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <Button variant="secondary" onClick={() => setConfirmDialog('secret')} isLoading={regenerateSecret.isPending} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Regenerate Notification Secret
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog === 'apiKey'}
        onConfirm={handleRegenerateApiKey}
        onCancel={() => setConfirmDialog(null)}
        title="Regenerate API Key?"
        description="Your current API key will stop working immediately."
        confirmLabel="Regenerate"
        variant="danger"
        isLoading={regenerateApiKey.isPending}
      />
      <ConfirmDialog
        open={confirmDialog === 'secret'}
        onConfirm={handleRegenerateSecret}
        onCancel={() => setConfirmDialog(null)}
        title="Regenerate Notification Secret?"
        description="Your current notification secret will be replaced."
        confirmLabel="Regenerate"
        variant="danger"
        isLoading={regenerateSecret.isPending}
      />
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-zn-border last:border-0">
      <span className="text-sm text-zn-secondary">{label}</span>
      <span className="text-sm text-zn-text font-medium">{value}</span>
    </div>
  );
}
