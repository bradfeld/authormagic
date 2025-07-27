'use client';

import {
  Users,
  UserPlus,
  Shield,
  Settings,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { UserProfileCard } from './UserProfileCard';
import { UserSearchInterface } from './UserSearchInterface';

export interface ClerkUserData {
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

interface UserManagementDashboardProps {
  initialUsers?: ClerkUserData[];
  initialTotalCount?: number;
}

export function UserManagementDashboard({
  initialUsers = [],
  initialTotalCount = 0,
}: UserManagementDashboardProps) {
  const [users, setUsers] = useState<ClerkUserData[]>(initialUsers);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [selectedUsers] = useState<Set<string>>(new Set()); // Placeholder for future bulk operations
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedUser, setSelectedUser] = useState<ClerkUserData | null>(null);
  const [bulkAction, setBulkAction] = useState<'promote' | 'demote' | null>(
    null,
  );

  const handleSearchResults = useCallback(
    (newUsers: ClerkUserData[], newTotalCount: number) => {
      setUsers(newUsers);
      setTotalCount(newTotalCount);
      // Clear selection functionality will be added in Phase 2
    },
    [],
  );

  const handleLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleRoleChange = async (
    userId: string,
    newRole: 'admin' | 'user',
  ) => {
    try {
      const response = await fetch('/api/admin/promote-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: userId,
          action: newRole === 'admin' ? 'promote' : 'demote',
        }),
      });

      if (!response.ok) {
        throw new Error(`Role change failed: ${response.status}`);
      }

      // Update user in local state
      setUsers(prev =>
        prev.map(user =>
          user.clerk_user_id === userId ? { ...user, role: newRole } : user,
        ),
      );

      setSuccess(
        `User ${newRole === 'admin' ? 'promoted to admin' : 'demoted to user'} successfully`,
      );
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Role change failed';
      handleError(errorMessage);
    }
  };

  const handleBulkRoleChange = async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    try {
      setIsLoading(true);
      const promises = Array.from(selectedUsers).map(userId =>
        handleRoleChange(userId, bulkAction === 'promote' ? 'admin' : 'user'),
      );

      await Promise.all(promises);
      // Bulk selection clearing will be added in Phase 2
      setBulkAction(null);
      setSuccess(`Bulk action completed successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      handleError('Bulk operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (userId: string, selected: boolean) => {
    // Bulk selection functionality will be added in Phase 2
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('User selection:', userId, selected);
    }
  };

  const handleSelectAll = () => {
    // Select all functionality will be added in Phase 2
  };

  const handleViewDetails = (user: ClerkUserData) => {
    setSelectedUser(user);
  };

  const handleUserDeleted = useCallback((deletedUserId: string) => {
    setUsers(prev => prev.filter(user => user.clerk_user_id !== deletedUserId));
    setTotalCount(prev => prev - 1);
  }, []);

  const selectedUsersData = users.filter(u =>
    selectedUsers.has(u.clerk_user_id),
  );
  const adminCount = users.filter(u => u.role === 'admin').length;
  const verifiedCount = users.filter(u => u.emailVerified).length;

  return (
    <div className="space-y-6">
      {/* Header with Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalCount}</div>
                <div className="text-xs text-gray-500">Total Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{adminCount}</div>
                <div className="text-xs text-gray-500">Administrators</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{verifiedCount}</div>
                <div className="text-xs text-gray-500">Verified</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{selectedUsers.size}</div>
                <div className="text-xs text-gray-500">Selected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Messages */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <span>{success}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Interface */}
      <UserSearchInterface
        onSearchResults={handleSearchResults}
        onLoading={handleLoading}
        onError={handleError}
        initialLimit={50}
      />

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}{' '}
                  selected
                </span>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedUsers.size === users.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setBulkAction('promote')}
                  disabled={selectedUsersData.every(u => u.role === 'admin')}
                >
                  <Shield className="mr-1 h-3 w-3" />
                  Promote to Admin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkAction('demote')}
                  disabled={selectedUsersData.every(u => u.role !== 'admin')}
                >
                  <Users className="mr-1 h-3 w-3" />
                  Remove Admin
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                {users.length} user{users.length !== 1 ? 's' : ''} found
                {totalCount !== users.length && ` (${totalCount} total)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                }
              >
                <Settings className="mr-2 h-4 w-4" />
                {viewMode === 'grid' ? 'List View' : 'Grid View'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading users...</span>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No users found
              </h3>
              <p className="text-gray-600">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
                  : 'space-y-2'
              }
            >
              {users.map(user => (
                <div key={user.clerk_user_id} className="relative">
                  <UserProfileCard
                    user={user}
                    onRoleChange={handleRoleChange}
                    onUserDeleted={handleUserDeleted}
                    onViewDetails={handleViewDetails}
                    compact={viewMode === 'list'}
                    currentUserId={undefined}
                  />
                  {/* Selection overlay for bulk actions */}
                  <div className="absolute top-2 left-2">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.clerk_user_id)}
                      onChange={e =>
                        handleUserSelect(user.clerk_user_id, e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'promote'
                ? 'Bulk Promote Users'
                : 'Bulk Remove Admin Access'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'promote' ? (
                <>
                  Are you sure you want to promote {selectedUsers.size} user
                  {selectedUsers.size !== 1 ? 's' : ''} to administrator? They
                  will have full access to admin features.
                </>
              ) : (
                <>
                  Are you sure you want to remove admin access from{' '}
                  {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}
                  ? They will become regular users.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkAction(null)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkRoleChange}
              disabled={isLoading}
              variant={bulkAction === 'demote' ? 'destructive' : 'default'}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Processing...
                </>
              ) : bulkAction === 'promote' ? (
                'Promote All'
              ) : (
                'Remove Admin Access'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <UserProfileCard
                user={selectedUser}
                onRoleChange={handleRoleChange}
                onUserDeleted={handleUserDeleted}
                showActions={false}
                currentUserId={undefined}
              />
              {/* Additional user details could go here */}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Note: Bulk delete functionality will be added in Phase 2 */}
    </div>
  );
}
