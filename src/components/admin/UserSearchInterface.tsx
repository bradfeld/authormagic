'use client';

import {
  Search,
  Filter,
  X,
  Users,
  Shield,
  CheckCircle,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClerkUserData {
  id: string;
  clerk_user_id: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string;
  emailVerified: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  role: 'admin' | 'user' | null;
}

interface SearchFilters {
  role: 'all' | 'admin' | 'user' | 'no_role';
  emailVerified: 'all' | 'verified' | 'unverified';
  sortBy: 'created_desc' | 'created_asc' | 'name_asc' | 'last_active';
}

interface UserSearchInterfaceProps {
  onSearchResults?: (users: ClerkUserData[], totalCount: number) => void;
  onLoading?: (loading: boolean) => void;
  onError?: (error: string) => void;
  initialLimit?: number;
}

export function UserSearchInterface({
  onSearchResults,
  onLoading,
  onError,
  initialLimit = 20,
}: UserSearchInterfaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    role: 'all',
    emailVerified: 'all',
    sortBy: 'created_desc',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<ClerkUserData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(initialLimit);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    onLoading?.(true);

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filters.role !== 'all' && { role: filters.role }),
      });

      const response = await fetch(`/api/admin/users?${params}`);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      let filteredUsers = data.users || [];

      // Apply client-side filters that aren't handled by the API
      if (filters.emailVerified !== 'all') {
        filteredUsers = filteredUsers.filter((user: ClerkUserData) => {
          return filters.emailVerified === 'verified'
            ? user.emailVerified
            : !user.emailVerified;
        });
      }

      // Apply sorting
      filteredUsers.sort((a: ClerkUserData, b: ClerkUserData) => {
        switch (filters.sortBy) {
          case 'created_asc':
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          case 'created_desc':
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          case 'name_asc':
            const nameA =
              a.name ||
              `${a.firstName || ''} ${a.lastName || ''}`.trim() ||
              'ZZZ';
            const nameB =
              b.name ||
              `${b.firstName || ''} ${b.lastName || ''}`.trim() ||
              'ZZZ';
            return nameA.localeCompare(nameB);
          case 'last_active':
            const lastActiveA = a.lastSignInAt
              ? new Date(a.lastSignInAt).getTime()
              : 0;
            const lastActiveB = b.lastSignInAt
              ? new Date(b.lastSignInAt).getTime()
              : 0;
            return lastActiveB - lastActiveA;
          default:
            return 0;
        }
      });

      setUsers(filteredUsers);
      setTotalCount(data.totalCount || filteredUsers.length);
      onSearchResults?.(filteredUsers, data.totalCount || filteredUsers.length);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Search error:', error);
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Search failed';
      onError?.(errorMessage);
      setUsers([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
      onLoading?.(false);
    }
  }, [searchTerm, filters, limit, onSearchResults, onLoading, onError]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [handleSearch]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      role: 'all',
      emailVerified: 'all',
      sortBy: 'created_desc',
    });
  };

  const exportUsers = () => {
    if (users.length === 0) return;

    const csvData = users.map(user => ({
      Name:
        user.name ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Unknown',
      Email: user.email || '',
      Role: user.role || 'User',
      'Email Verified': user.emailVerified ? 'Yes' : 'No',
      'Join Date': new Date(user.createdAt).toLocaleDateString(),
      'Last Active': user.lastSignInAt
        ? new Date(user.lastSignInAt).toLocaleDateString()
        : 'Never',
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.role !== 'all') count++;
    if (filters.emailVerified !== 'all') count++;
    if (filters.sortBy !== 'created_desc') count++;
    if (searchTerm) count++;
    return count;
  }, [filters, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              User Search
            </CardTitle>
            <CardDescription>
              Search and filter users across your application
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportUsers}
              disabled={users.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export ({users.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
            }}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select
            value={filters.role}
            onValueChange={value => handleFilterChange('role', value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="no_role">No Role</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.emailVerified}
            onValueChange={value => handleFilterChange('emailVerified', value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="verified">Verified Only</SelectItem>
              <SelectItem value="unverified">Unverified Only</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.sortBy}
            onValueChange={value => handleFilterChange('sortBy', value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Newest First</SelectItem>
              <SelectItem value="created_asc">Oldest First</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="last_active">Last Active</SelectItem>
            </SelectContent>
          </Select>

          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-8"
            >
              <X className="mr-1 h-3 w-3" />
              Clear ({activeFiltersCount})
            </Button>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between border-t py-2">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{totalCount} total users</span>
            </div>
            {users.length !== totalCount && (
              <div>Showing {users.length} filtered results</div>
            )}
            {isLoading && (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Searching...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {users.filter(u => u.role === 'admin').length > 0 && (
              <Badge variant="outline" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                {users.filter(u => u.role === 'admin').length} Admins
              </Badge>
            )}
            {users.filter(u => u.emailVerified).length > 0 && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="mr-1 h-3 w-3" />
                {users.filter(u => u.emailVerified).length} Verified
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
