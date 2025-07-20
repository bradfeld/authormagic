'use client';

// Removed unused useUser import
import { Users, UserCheck, Mail, Calendar, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CustomUserButton } from '@/components/ui/custom-user-button';
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
}

export default function AdminWaitlistPage() {
  const router = useRouter();
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
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
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch {
      // Error loading users - handle gracefully
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading waitlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Waitlist Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage user approvals and waitlist queue
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline">Back to Admin</Button>
            </Link>
            <CustomUserButton />
          </div>
        </div>

        {/* Search and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
                  variant="outline"
                  size="sm"
                  onClick={selectAllVisible}
                  disabled={filteredUsers.length === 0}
                >
                  Select All ({filteredUsers.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedUsers.size === 0}
                >
                  Clear Selection
                </Button>
                <Button
                  onClick={() => openApprovalDialog(Array.from(selectedUsers))}
                  disabled={selectedUsers.size === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Approve Selected ({selectedUsers.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                    {filteredUsers.length}
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
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      selectedUsers.has(user.clerk_user_id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.clerk_user_id)}
                        onChange={() => toggleUserSelection(user.clerk_user_id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />

                      {/* Position Badge */}
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          #{user.waitlist_position}
                        </span>
                      </div>

                      {/* User Info */}
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.name || 'Unknown User'}
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
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? (
                  <div>
                    <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No results found
                    </h3>
                    <p>No users match your search criteria</p>
                  </div>
                ) : (
                  <div>
                    <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      No users on waitlist
                    </h3>
                    <p>All users have been approved or the waitlist is empty</p>
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
              <DialogTitle>Approve Users</DialogTitle>
              <DialogDescription>
                You are about to approve {approvalDialog.users.length} user(s).
                They will gain access to the platform immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Users to approve */}
              <div>
                <h4 className="text-sm font-medium mb-2">Users to approve:</h4>
                <div className="space-y-2">
                  {approvalDialog.users.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Badge variant="outline">#{user.waitlist_position}</Badge>
                      <span>{user.name || 'Unknown'}</span>
                      <span className="text-gray-500">({user.email})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin notes */}
              <div>
                <label className="text-sm font-medium">
                  Admin Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add any notes about this approval..."
                  value={approvalDialog.notes}
                  onChange={e =>
                    setApprovalDialog(prev => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  rows={3}
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
                <UserCheck className="w-4 h-4 mr-2" />
                Approve {approvalDialog.users.length} User(s)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
