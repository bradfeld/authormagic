'use client';

import { useUser } from '@clerk/nextjs';
import {
  ChevronLeft,
  Home,
  Book,
  User,
  Settings,
  Users,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';


interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Books',
    href: '/books',
    icon: Book,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
  {
    name: 'Admin',
    href: '/admin/dashboard',
    icon: Users,
    adminOnly: true,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar({
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();

  const collapsed = controlledCollapsed ?? internalCollapsed;

  const handleCollapsedChange = (newCollapsed: boolean) => {
    if (onCollapsedChange) {
      onCollapsedChange(newCollapsed);
    } else {
      setInternalCollapsed(newCollapsed);
    }
  };

  // Check if user is admin (simplified check)
  const isAdmin = user?.emailAddresses?.[0]?.emailAddress === 'brad@feld.com';

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-gray-900">AuthorMagic</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleCollapsedChange(!collapsed)}
          className={cn(
            'h-8 w-8 transition-transform duration-200',
            collapsed && 'rotate-180',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navigationItems.map(item => {
          // Skip admin items if user is not admin
          if (item.adminOnly && !isAdmin) {
            return null;
          }

          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150',
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                  collapsed && 'justify-center px-2',
                )}
              >
                <item.icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.name}</span>
                    {item.badge && (
                      <span className="ml-2 bg-blue-100 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-xs">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.fullName || `${user?.firstName} ${user?.lastName}`}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-xs">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </div>
  );
}
