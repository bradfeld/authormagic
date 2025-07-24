'use client';

import { Search, Bell, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { CustomUserButton } from '@/components/ui/custom-user-button';
import { Input } from '@/components/ui/input';
import { Sidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0',
          isMobile && sidebarCollapsed && '-translate-x-full',
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* Mobile overlay */}
      {isMobile && !sidebarCollapsed && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="lg:hidden"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </Button>
              )}

              {/* Search */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  className="pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5 text-gray-500" />
              </Button>

              {/* Settings */}
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5 text-gray-500" />
              </Button>

              {/* User Menu */}
              <CustomUserButton />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
