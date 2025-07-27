'use client';

import {
  Shield,
  User,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  MoreVertical,
  Crown,
  Activity,
  Trash2,
} from 'lucide-react';
import { useState, useCallback } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { UserDeletionDialog } from './UserDeletionDialog';

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

interface UserProfileCardProps {
  user: ClerkUserData;
  onRoleChange?: (userId: string, newRole: 'admin' | 'user') => void;
  onViewDetails?: (user: ClerkUserData) => void;
  showActions?: boolean;
  compact?: boolean;
  onUserDeleted?: (userId: string) => void;
  isUpdating?: boolean;
  currentUserId?: string;
}

export function UserProfileCard({
  user,
  onRoleChange,
  onViewDetails,
  showActions = true,
  compact = false,
  onUserDeleted,
  isUpdating = false,
  currentUserId,
}: UserProfileCardProps) {
  const [isRoleChangeOpen, setIsRoleChangeOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'promote' | 'demote' | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayName =
    user.name ||
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    'Unknown User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isAdmin = user.role === 'admin';
  const joinDate = new Date(user.createdAt).toLocaleDateString();
  const lastActivity = user.lastSignInAt
    ? new Date(user.lastSignInAt).toLocaleDateString()
    : 'Never';

  const handleRoleChange = async (action: 'promote' | 'demote') => {
    if (!onRoleChange) return;

    setIsLoading(true);
    try {
      const newRole = action === 'promote' ? 'admin' : 'user';
      await onRoleChange(user.clerk_user_id, newRole);
      setIsRoleChangeOpen(false);
      setPendingAction(null);
    } catch (error) {
      // Error handling is done in parent component
      // We just log for debugging purposes
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Role change failed:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: 'promote' | 'demote') => {
    setPendingAction(action);
    setIsRoleChangeOpen(true);
  };

  const handleDeleteUser = useCallback(
    async (userId: string, confirmationText: string) => {
      setIsDeleting(true);
      try {
        const response = await fetch('/api/admin/delete-user', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userIdToDelete: userId,
            confirmationText,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete user');
        }

        const result = await response.json();

        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('✅ User deleted successfully:', result);
        }

        // Notify parent component
        onUserDeleted?.(userId);

        // Close dialog
        setShowDeleteDialog(false);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error('❌ Delete user error:', error);
        }
        throw error; // Let the dialog handle the error display
      } finally {
        setIsDeleting(false);
      }
    },
    [onUserDeleted],
  );

  const canDeleteUser = currentUserId !== user.id; // Cannot delete self

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-white p-3 transition-colors hover:bg-gray-50">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.profileImageUrl} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{displayName}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={isAdmin ? 'default' : 'secondary'}
            className="text-xs"
          >
            {isAdmin ? 'Admin' : 'User'}
          </Badge>
          {user.emailVerified ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.profileImageUrl} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {displayName}
                  {isAdmin && <Crown className="h-4 w-4 text-yellow-500" />}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  {user.email || 'No email'}
                  {user.emailVerified ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                </CardDescription>
              </div>
            </div>

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails?.(user)}>
                    <User className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {!isAdmin ? (
                    <DropdownMenuItem
                      onClick={() => handleActionClick('promote')}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Promote to Admin
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => handleActionClick('demote')}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Demote to User
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={!canDeleteUser || isUpdating || isDeleting}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {!canDeleteUser ? 'Cannot Delete Self' : 'Delete User'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Role and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isAdmin ? 'default' : 'secondary'}>
                {isAdmin ? (
                  <>
                    <Shield className="mr-1 h-3 w-3" />
                    Administrator
                  </>
                ) : (
                  <>
                    <User className="mr-1 h-3 w-3" />
                    User
                  </>
                )}
              </Badge>
              <Badge variant={user.emailVerified ? 'outline' : 'destructive'}>
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
          </div>

          {/* User Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-gray-500">Joined</div>
                <div className="font-medium">{joinDate}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-gray-500">Last Active</div>
                <div className="font-medium">{lastActivity}</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(user)}
                className="flex-1"
              >
                <User className="mr-1 h-3 w-3" />
                Details
              </Button>
              {!isAdmin ? (
                <Button
                  size="sm"
                  onClick={() => handleActionClick('promote')}
                  className="flex-1"
                >
                  <Shield className="mr-1 h-3 w-3" />
                  Make Admin
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleActionClick('demote')}
                  className="flex-1"
                >
                  <User className="mr-1 h-3 w-3" />
                  Remove Admin
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Change Confirmation Dialog */}
      <Dialog open={isRoleChangeOpen} onOpenChange={setIsRoleChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === 'promote'
                ? 'Promote to Admin'
                : 'Remove Admin Access'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === 'promote' ? (
                <>
                  Are you sure you want to promote{' '}
                  <strong>{displayName}</strong> to administrator? They will
                  have full access to admin features.
                </>
              ) : (
                <>
                  Are you sure you want to remove admin access from{' '}
                  <strong>{displayName}</strong>? They will become a regular
                  user.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleChangeOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => pendingAction && handleRoleChange(pendingAction)}
              disabled={isLoading}
              variant={pendingAction === 'demote' ? 'destructive' : 'default'}
            >
              {isLoading
                ? 'Processing...'
                : pendingAction === 'promote'
                  ? 'Promote'
                  : 'Remove Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Deletion Dialog */}
      <UserDeletionDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        user={{
          id: user.id,
          name: user.name || undefined,
          email: user.email || '',
          username: user.clerk_user_id, // Assuming clerk_user_id is the username
          imageUrl: user.profileImageUrl,
          isAdmin: user.role === 'admin',
        }}
        onConfirmDelete={handleDeleteUser}
        isDeleting={isDeleting}
      />
    </>
  );
}
