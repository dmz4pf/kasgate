import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, User, ChevronDown, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useMerchant } from '@/hooks/useMerchant';

interface HeaderProps {
  onMenuClick: () => void;
}

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/sessions': 'Payments',
  '/settings': 'Settings',
  '/integration': 'Integration',
  '/webhooks': 'Notifications',
};

function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith('/sessions/')) return 'Payment Details';
  return 'Dashboard';
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { data: merchant } = useMerchant();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const title = getPageTitle(location.pathname);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-5 sm:px-8 lg:px-14 bg-zn-bg/80 backdrop-blur-sm border-b border-zn-border">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-lg text-zn-secondary hover:text-zn-text hover:bg-zn-alt"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-zn-text">{title}</h1>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-zn-alt"
        >
          <div className="w-7 h-7 rounded-full bg-zn-alt flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-zn-secondary" />
          </div>
          <span className="hidden sm:inline text-zn-secondary font-medium truncate max-w-[160px]">
            {merchant?.name || 'My Business'}
          </span>
          <ChevronDown className="h-4 w-4 text-zn-muted" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-zn-surface border border-zn-border rounded-lg shadow-lg py-1 z-50">
            <button
              onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-zn-secondary hover:bg-zn-alt hover:text-zn-text"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <div className="border-t border-zn-border my-1" />
            <button
              onClick={() => { setDropdownOpen(false); logout(); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-zn-secondary hover:bg-zn-error/10 hover:text-zn-error"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
