'use client';

import { useUser } from '@clerk/nextjs';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Home,
  Book,
  User,
  Settings,
  Users,
  BarChart3,
  Shield,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
  children?: NavigationItem[];
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
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  // Admin section with children
  {
    name: 'Admin',
    icon: Shield,
    adminOnly: true,
    children: [
      {
        name: 'Dashboard',
        href: '/admin/dashboard',
        icon: Home,
        adminOnly: true,
      },
      {
        name: 'User Management',
        href: '/admin/users',
        icon: Users,
        adminOnly: true,
      },
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
        adminOnly: true,
      },
      {
        name: 'System Health',
        href: '/admin/system',
        icon: Activity,
        adminOnly: true,
      },
      {
        name: 'Activity Log',
        href: '/admin/activity',
        icon: Shield,
        adminOnly: true,
      },
    ],
  },
];

export function Sidebar({
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);
  const [adminMenuExpanded, setAdminMenuExpanded] = useState(false);
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

  // Check if user is admin using the proper role-based system
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) {
        setIsAdmin(false);
        setAdminCheckLoading(false);
        return;
      }

      // Only run admin check on client-side to avoid SSR issues
      if (typeof window === 'undefined') {
        // During SSR, just use email check as fallback
        setIsAdmin(user?.emailAddresses?.[0]?.emailAddress === 'brad@feld.com');
        setAdminCheckLoading(false);
        return;
      }

      try {
        // Use the existing admin API that checks roles properly
        const response = await fetch('/api/admin/users?limit=1');

        if (response.ok) {
          // If we can access admin API, user is admin
          setIsAdmin(true);
        } else if (response.status === 403) {
          // Forbidden means not admin
          setIsAdmin(false);
        } else {
          // Other errors - fallback to email check
          setIsAdmin(
            user?.emailAddresses?.[0]?.emailAddress === 'brad@feld.com',
          );
        }
      } catch {
        // Network error - fallback to email check
        setIsAdmin(user?.emailAddresses?.[0]?.emailAddress === 'brad@feld.com');
      } finally {
        setAdminCheckLoading(false);
      }
    };

    checkAdminStatus();
  }, [user?.id, user?.emailAddresses]);

  // Auto-expand admin menu if we're on an admin page
  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      setAdminMenuExpanded(true);
    }
  }, [pathname]);

  const isActiveItem = (item: NavigationItem): boolean => {
    if (item.href) {
      return (
        pathname === item.href ||
        (item.href !== '/dashboard' && pathname.startsWith(item.href))
      );
    }
    // For parent items without href, check if any children are active
    if (item.children) {
      return item.children.some(
        child =>
          child.href &&
          (pathname === child.href ||
            (child.href !== '/dashboard' && pathname.startsWith(child.href))),
      );
    }
    return false;
  };

  const renderNavigationItem = (item: NavigationItem, isChild = false) => {
    // Skip admin items if user is not admin (but show loading state)
    if (item.adminOnly && !adminCheckLoading && !isAdmin) {
      return null;
    }

    // Show placeholder for admin items while loading
    if (item.adminOnly && adminCheckLoading) {
      return (
        <div
          key={item.name}
          className={cn(
            'flex items-center rounded-lg px-3 py-2 text-sm font-medium',
            'animate-pulse text-gray-400',
            collapsed && 'justify-center px-2',
            isChild && 'ml-6',
          )}
        >
          <item.icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
          {!collapsed && <span className="flex-1">Loading...</span>}
        </div>
      );
    }

    const isActive = isActiveItem(item);
    const hasChildren = item.children && item.children.length > 0;

    // Parent item with children (no href)
    if (hasChildren && !item.href) {
      return (
        <div key={item.name}>
          <button
            onClick={() => {
              if (!collapsed) {
                setAdminMenuExpanded(!adminMenuExpanded);
              }
            }}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
              isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              collapsed && 'justify-center px-2',
            )}
          >
            <item.icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.name}</span>
                {hasChildren && (
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-blue-500" />
                    {adminMenuExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                )}
              </>
            )}
          </button>

          {/* Children items */}
          {hasChildren && !collapsed && adminMenuExpanded && (
            <div className="mt-1 ml-4 space-y-1 border-l border-gray-200 pl-4">
              {item.children?.map(child => renderNavigationItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    // Regular navigation item with href
    if (item.href) {
      return (
        <Link key={item.name} href={item.href}>
          <div
            className={cn(
              'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
              isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              collapsed && 'justify-center px-2',
              isChild && 'ml-0', // Child items don't need extra margin since they're in the border container
            )}
          >
            <item.icon className={cn('h-5 w-5', !collapsed && 'mr-3')} />
            {!collapsed && (
              <>
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                    {item.badge}
                  </span>
                )}
                {item.adminOnly && !isChild && (
                  <Shield className="ml-2 h-3 w-3 text-blue-500" />
                )}
              </>
            )}
          </div>
        </Link>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-black">
              <span className="text-xs font-bold text-white">A</span>
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
      <nav className="flex-1 space-y-1 p-2">
        {navigationItems.map(item => renderNavigationItem(item))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-xs">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {user?.fullName || `${user?.firstName} ${user?.lastName}`}
              </p>
              <p className="truncate text-xs text-gray-500">
                {user?.emailAddresses?.[0]?.emailAddress}
                {isAdmin && !adminCheckLoading && (
                  <span className="ml-1 font-medium text-blue-600">Admin</span>
                )}
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
