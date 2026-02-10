import { Menu, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { merchant, logout } = useAuthStore();

  return (
    <header className="h-16 bg-[#151C28] border-b border-[#2a3444] px-4 lg:px-6 flex items-center justify-between">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-[#9ca3af] hover:text-[#e5e7eb]"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        {merchant && (
          <span className="text-sm text-[#9ca3af]">
            {merchant.businessName}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
