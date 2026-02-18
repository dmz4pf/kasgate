import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  Code,
  X,
  Webhook,
  LogOut,
  User,
} from 'lucide-react';
import { useMerchant } from '@/hooks/useMerchant';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/sessions', icon: CreditCard, label: 'Sessions' },
    ],
  },
  {
    label: 'Configure',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings' },
      { to: '/integration', icon: Code, label: 'Integration' },
      { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout } = useAuthStore();
  const { data: merchant } = useMerchant();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'bg-zn-surface/70 backdrop-blur-xl border-r border-zn-border',
          'fixed top-0 left-0 h-full w-[260px] z-50',
          'flex flex-col py-6 px-5',
          'transform transition-transform duration-200',
          'lg:translate-x-0 lg:static',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-zn-muted hover:text-zn-text hover:bg-zn-alt"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2 py-2">
          <div className="w-10 h-10 rounded-[10px] overflow-hidden shadow-lg shadow-zn-accent/20">
            <img src="/logo.png" alt="KasGate" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-semibold text-gradient tracking-tight">KasGate</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          {navGroups.map((group, groupIdx) => (
            <div key={group.label} className={cn(groupIdx > 0 && 'mt-8')}>
              <div className="text-[11px] font-medium text-zn-muted uppercase tracking-wider mb-3 px-3">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 h-10 px-3 rounded-[10px] text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-gradient-to-br from-zn-accent/20 to-zn-purple/10 text-zn-accent shadow-sm shadow-zn-accent/10'
                          : 'text-zn-secondary hover:bg-zn-accent/10 hover:text-zn-text'
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] opacity-70" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto pt-5 border-t border-zn-border space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-zn-alt flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-zn-secondary" />
            </div>
            <span className="text-sm text-zn-secondary font-medium truncate">
              {merchant?.name || 'My Business'}
            </span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 h-10 px-3 rounded-[10px] text-sm font-medium text-zn-secondary hover:text-zn-error hover:bg-zn-error/10 w-full transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
