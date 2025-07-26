'use client';

import { Users, UserCheck, Mail, Calendar, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface WaitlistUser {
  id: string;
  clerk_user_id: string;
  status: 'waitlisted' | 'approved' | 'blocked';
  waitlist_position: number | null;
  approved_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  name: string | null;
  email: string | null;
  profile_image_url: string | null;
  role: 'admin' | 'user' | null;
}

interface WaitlistManagementProps {
  initialUsers: WaitlistUser[];
}

export function WaitlistManagement({ initialUsers }: WaitlistManagementProps) {
  const router = useRouter();
  const [users, setUsers] = useState<WaitlistUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    users: WaitlistUser[];
    notes: string;
  }>({
    open: false,
    users: [],
    notes: '',
  });

  const [removalDialog, setRemovalDialog] = useState<{
    open: boolean;
    users: WaitlistUser[];
    reason: string;
  }>({
    open: false,
    users: [],
    reason: '',
  });

  // Load waitlisted users
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/waitlist');

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const users = data.data?.users || [];
      setUsers(users);
    } catch (error) {
      // Show user-friendly error message
      alert(
        `Failed to load waitlist: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Filter users based on search term
  const filteredUsers = users.filter(
    user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Select all filtered users
  const selectAllVisible = () => {
    const allVisible = new Set(filteredUsers.map(u => u.clerk_user_id));
    setSelectedUsers(allVisible);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  // Open approval dialog
  const openApprovalDialog = (userIds: string[]) => {
    const usersToApprove = users.filter(u => userIds.includes(u.clerk_user_id));
    setApprovalDialog({
      open: true,
      users: usersToApprove,
      notes: '',
    });
  };

  // Approve users
  const approveUsers = async () => {
    try {
      const userIds = approvalDialog.users.map(u => u.clerk_user_id);

      const response = await fetch('/api/admin/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds,
          adminNotes: approvalDialog.notes || 'Approved by admin',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve users');
      }

      // Refresh the list
      await loadUsers();

      // Clear selection and close dialog
      setSelectedUsers(new Set());
      setApprovalDialog({ open: false, users: [], notes: '' });
    } catch {
      // Handle approval error
      alert('Failed to approve users. Please try again.');
    }
  };

  // Approve single user
  const approveSingleUser = async (userId: string) => {
    openApprovalDialog([userId]);
  };

  // Remove single user
  const removeSingleUser = async (userId: string) => {
    openRemovalDialog([userId]);
  };

  // Open removal dialog
  const openRemovalDialog = (userIds: string[]) => {
    const usersToRemove = users.filter(u => userIds.includes(u.clerk_user_id));
    setRemovalDialog({
      open: true,
      users: usersToRemove,
      reason: '',
    });
  };

  // Remove users
  const removeUsers = async () => {
    try {
      const userIds = removalDialog.users.map(u => u.clerk_user_id);

      const response = await fetch('/api/admin/bulk-remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds,
          adminNotes: removalDialog.reason || 'Removed by admin',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove users');
      }

      // Refresh the list
      await loadUsers();

      // Clear selection and close dialog
      setSelectedUsers(new Set());
      setRemovalDialog({ open: false, users: [], reason: '' });
    } catch {
      // Handle removal error
      alert('Failed to remove users. Please try again.');
    }
  };

  // Promote user to admin
  const promoteToAdmin = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/promote-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          action: 'promote',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to promote user');
      }

      // Refresh the list
      await loadUsers();
      alert('User promoted to admin successfully!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to promote user: ${errorMessage}`);
    }
  };

  // Demote admin to user
  const demoteFromAdmin = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/promote-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          action: 'demote',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to demote user');
      }

      // Refresh the list
      await loadUsers();
      alert('User demoted to regular user successfully!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to demote user: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-gray-300 rounded animate-pulse"></div>
                  <div>
                    <div className="h-6 w-8 bg-gray-300 rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Users List Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-100 rounded animate-pulse"
                ></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Bulk Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={selectAllVisible}
                disabled={filteredUsers.length === 0}
              >
                Select All ({filteredUsers.length})
              </Button>

              {selectedUsers.size > 0 && (
                <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedUsers.size} user(s) selected
                  </span>
                  <Button
                    size="sm"
                    onClick={() =>
                      openApprovalDialog(Array.from(selectedUsers))
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Approve Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openRemovalDialog(Array.from(selectedUsers))}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove Selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-gray-600">Total Waitlisted</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {searchTerm ? filteredUsers.length : users.length}
                </div>
                <div className="text-sm text-gray-600">Filtered Results</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{selectedUsers.size}</div>
                <div className="text-sm text-gray-600">Selected</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Waitlisted Users</CardTitle>
          <CardDescription>
            Users waiting for approval, sorted by position
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.clerk_user_id)}
                      onChange={() => toggleUserSelection(user.clerk_user_id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />

                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        #{user.waitlist_position}
                      </span>
                    </div>

                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {user.name || 'Unknown User'}
                        {user.role && (
                          <Badge
                            variant={
                              user.role === 'admin' ? 'default' : 'secondary'
                            }
                            className={
                              user.role === 'admin'
                                ? 'bg-purple-600 hover:bg-purple-700'
                                : ''
                            }
                          >
                            {user.role}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email || 'No email'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {user.admin_notes && (
                        <div className="text-xs text-gray-500 mt-1">
                          Note: {user.admin_notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      Position #{user.waitlist_position}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => approveSingleUser(user.clerk_user_id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeSingleUser(user.clerk_user_id)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>

                    {/* Role Management Buttons */}
                    {user.role === 'admin' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => demoteFromAdmin(user.clerk_user_id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Demote Admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => promoteToAdmin(user.clerk_user_id)}
                        className="text-purple-600 border-purple-300 hover:bg-purple-50"
                      >
                        Make Admin
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? (
                <div>
                  <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-gray-500">
                    Try adjusting your search terms.
                  </p>
                </div>
              ) : (
                <div>
                  <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No users on waitlist
                  </h3>
                  <p className="text-gray-500">
                    All users have been approved or the waitlist is empty
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog
        open={approvalDialog.open}
        onOpenChange={open => setApprovalDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <UserCheck className="w-5 h-5" />
              Approve Users
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve{' '}
              {approvalDialog.users.length === 1
                ? 'this user'
                : `these ${approvalDialog.users.length} users`}
              ? They will gain access to the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Users to be approved */}
            <div>
              <h4 className="font-medium mb-2">Users to approve:</h4>
              <div className="space-y-2">
                {approvalDialog.users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded"
                  >
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-xs">
                        #{user.waitlist_position}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {user.name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {user.email || 'No email'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Notes (optional)
              </label>
              <Textarea
                value={approvalDialog.notes}
                onChange={e =>
                  setApprovalDialog(prev => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Add notes about this approval..."
                className="h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setApprovalDialog({ open: false, users: [], notes: '' })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={approveUsers}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserCheck className="w-4 h-4 mr-1" />
              Approve{' '}
              {approvalDialog.users.length === 1
                ? 'User'
                : `${approvalDialog.users.length} Users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Removal Confirmation Dialog */}
      <Dialog
        open={removalDialog.open}
        onOpenChange={open => setRemovalDialog(prev => ({ ...prev, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Remove Users from Waitlist
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              {removalDialog.users.length === 1
                ? 'this user'
                : `these ${removalDialog.users.length} users`}{' '}
              from the waitlist? This action will block their access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Users to be removed */}
            <div className="space-y-2">
              {removalDialog.users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded"
                >
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-xs">
                      #{user.waitlist_position}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {user.name || 'Unknown User'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {user.email || 'No email'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Removal reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for removal (optional)
              </label>
              <Textarea
                value={removalDialog.reason}
                onChange={e =>
                  setRemovalDialog(prev => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="Enter reason for removing these users..."
                className="h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRemovalDialog({ open: false, users: [], reason: '' })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={removeUsers}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove{' '}
              {removalDialog.users.length === 1
                ? 'User'
                : `${removalDialog.users.length} Users`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
