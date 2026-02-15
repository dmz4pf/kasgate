import { Copy, Clock, Wallet } from 'lucide-react';
import { FakeQRCode } from './FakeQRCode';
import { cn } from '@/lib/utils';

interface WidgetPreviewProps {
  amount?: string;
  address?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export function WidgetPreview({
  amount = '125.50',
  address = 'kaspa:qz8h...x9f2',
  className,
  theme = 'dark'
}: WidgetPreviewProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden border',
        isDark
          ? 'bg-zn-surface border-zn-border'
          : 'bg-white border-gray-200',
        className
      )}
      style={{ width: 320 }}
    >
      {/* Header */}
      <div
        className={cn(
          'px-6 py-5 border-b',
          isDark ? 'border-zn-border' : 'border-gray-200'
        )}
      >
        <div className={cn(
          'text-sm font-medium mb-1',
          isDark ? 'text-zn-secondary' : 'text-gray-500'
        )}>
          Pay with Kaspa
        </div>
        <div className={cn(
          'text-2xl font-semibold font-mono',
          isDark ? 'text-zn-text' : 'text-gray-900'
        )}>
          {amount} <span className={isDark ? 'text-zn-link' : 'text-blue-500'}>KAS</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6">
        {/* Kasware Button (Demo) */}
        <button
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md',
            'font-medium text-sm transition-all duration-150',
            isDark
              ? 'bg-zn-accent text-zn-bg hover:bg-zinc-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          <Wallet className="h-4 w-4" />
          Pay with Kasware
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-5">
          <div className={cn(
            'flex-1 h-px',
            isDark ? 'bg-zn-border' : 'bg-gray-200'
          )} />
          <span className={cn(
            'text-xs',
            isDark ? 'text-zn-muted' : 'text-gray-400'
          )}>
            or pay manually
          </span>
          <div className={cn(
            'flex-1 h-px',
            isDark ? 'bg-zn-border' : 'bg-gray-200'
          )} />
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          <FakeQRCode size={160} />
        </div>

        {/* Address */}
        <div className="text-center mb-4">
          <div className={cn(
            'text-xs mb-2',
            isDark ? 'text-zn-muted' : 'text-gray-400'
          )}>
            Send exactly {amount} KAS to:
          </div>
          <div className={cn(
            'font-mono text-sm px-4 py-2 rounded-md',
            isDark ? 'bg-zn-alt text-zn-secondary' : 'bg-gray-100 text-gray-900'
          )}>
            {address}
          </div>
        </div>

        {/* Copy Button */}
        <button
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md',
            'text-sm font-medium transition-all duration-150',
            isDark
              ? 'bg-transparent text-zn-text hover:bg-zn-alt border border-zn-border'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
          )}
        >
          <Copy className="h-4 w-4" />
          Copy Address
        </button>

        {/* Timer */}
        <div className={cn(
          'flex items-center justify-center gap-2 mt-5 text-sm',
          isDark ? 'text-zn-secondary' : 'text-gray-500'
        )}>
          <Clock className="h-4 w-4" />
          <span>Expires in: <span className="font-medium text-zn-warning font-mono">14:32</span></span>
        </div>
      </div>

      {/* Footer */}
      <div className={cn(
        'px-6 py-4 border-t',
        isDark ? 'border-zn-border' : 'border-gray-200'
      )}>
        <div className={cn(
          'text-xs text-center',
          isDark ? 'text-zn-muted' : 'text-gray-400'
        )}>
          Powered by <span className={isDark ? 'text-zn-link font-medium' : 'text-blue-500 font-medium'}>KasGate</span>
        </div>
      </div>
    </div>
  );
}
