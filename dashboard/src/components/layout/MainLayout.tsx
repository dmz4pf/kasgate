import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-zn-bg relative">
      <div className="bg-ambient" />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 min-h-screen overflow-y-auto relative z-[1]">
        <div className="lg:hidden flex items-center p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-zn-secondary hover:text-zn-text hover:bg-zn-surface/70"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-6 pb-10 sm:px-8 lg:px-12 lg:pt-10 lg:pb-16">
          <div className="max-w-[1280px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
