import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function toast(type: Toast['type'], message: string) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, type, message }];
  notifyListeners();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  }, 4000);
}

const typeConfig = {
  success: { icon: CheckCircle, bg: 'bg-zn-elevated border-zn-success/30', text: 'text-zn-success' },
  error: { icon: AlertCircle, bg: 'bg-zn-elevated border-zn-error/30', text: 'text-zn-error' },
  info: { icon: Info, bg: 'bg-zn-elevated border-zn-link/30', text: 'text-zn-link' },
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastListeners.push(setCurrentToasts);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setCurrentToasts);
    };
  }, []);

  const removeToast = (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  };

  if (currentToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {currentToasts.map((t) => {
        const config = typeConfig[t.type];
        const Icon = config.icon;
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg border min-w-[300px] shadow-lg shadow-black/20 animate-toast-enter',
              config.bg
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', config.text)} />
            <span className={cn('flex-1 text-sm', config.text)}>{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="text-zn-muted hover:text-zn-text">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
