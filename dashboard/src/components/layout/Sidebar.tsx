import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  Code,
  X,
  Webhook,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sessions', icon: CreditCard, label: 'Sessions' },
  { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/integration', icon: Code, label: 'Integration' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-[#151C28] border-r border-[#2a3444] z-50',
          'transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0 lg:static',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#2a3444]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#49EACB] flex items-center justify-center">
              <span className="text-[#0A0F14] font-bold text-lg">K</span>
            </div>
            <span className="text-xl font-bold text-[#e5e7eb]">KasGate</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-[#9ca3af] hover:text-[#e5e7eb]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#49EACB]/10 text-[#49EACB]'
                    : 'text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#0A0F14]'
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
