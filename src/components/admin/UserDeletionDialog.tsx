'use client';

import {
  AlertTriangle,
  Trash2,
  X,
  User,
  Shield,
  Database,
  History,
} from 'lucide-react';
import { useState, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface UserDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name?: string;
    email: string;
    username?: string;
    imageUrl?: string;
    isAdmin?: boolean;
  };
  onConfirmDelete: (userId: string, confirmationText: string) => Promise<void>;
  isDeleting?: boolean;
}

export function UserDeletionDialog({
  isOpen,
  onClose,
  user,
  onConfirmDelete,
  isDeleting = false,
}: UserDeletionDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const [showWarnings, setShowWarnings] = useState(true);

  const expectedConfirmation = user.username || user.email;
  const isConfirmationValid = confirmationText === expectedConfirmation;
  const canDelete = isConfirmationValid && finalConfirmation && !isDeleting;

  const handleConfirmDelete = useCallback(async () => {
    if (!canDelete) return;

    try {
      await onConfirmDelete(user.id, confirmationText);
      // Reset form
      setConfirmationText('');
      setFinalConfirmation(false);
      setShowWarnings(true);
      onClose();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to delete user:', error);
      }
      // Error handling is done in parent component
    }
  }, [canDelete, onConfirmDelete, user.id, confirmationText, onClose]);

  const handleClose = useCallback(() => {
    if (isDeleting) return; // Prevent closing during deletion
    setConfirmationText('');
    setFinalConfirmation(false);
    setShowWarnings(true);
    onClose();
  }, [isDeleting, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete User Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please review the consequences
            carefully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Information */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
              <User className="h-4 w-4" />
              User to be deleted
            </h4>
            <div className="flex items-center gap-3">
              {user.imageUrl && (
                <div
                  className="h-10 w-10 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${user.imageUrl})` }}
                  aria-label={user.name || user.email}
                />
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {user.name || 'Unknown Name'}
                  {user.isAdmin && (
                    <Badge variant="destructive" className="ml-2">
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-gray-600">{user.email}</p>
                {user.username && (
                  <p className="text-sm text-gray-500">@{user.username}</p>
                )}
              </div>
            </div>
          </div>

          {/* Warning Messages */}
          {showWarnings && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h4 className="mb-2 flex items-center gap-2 font-medium text-red-800">
                <AlertTriangle className="h-4 w-4" />
                ⚠️ Critical Warning
              </h4>
              <ul className="space-y-1 text-sm text-red-700">
                <li>• This will permanently delete the user from the system</li>
                <li>
                  • The user will lose access to their account immediately
                </li>
                <li>
                  • All user data and associated artifacts will be removed
                </li>
                <li>• This action cannot be undone or reversed</li>
                {user.isAdmin && (
                  <li className="font-medium">
                    • This will remove admin privileges from this user
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* What will be deleted */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-medium text-orange-800">
              <Database className="h-4 w-4" />
              What will be deleted
            </h4>
            <ul className="space-y-1 text-sm text-orange-700">
              <li>✅ User account from authentication system (Clerk)</li>
              <li>✅ User roles and permissions (Supabase)</li>
              <li>✅ User profile data (if any)</li>
              <li>✅ User&apos;s book library and preferences (if any)</li>
              <li className="flex items-center gap-1">
                <History className="h-3 w-3" />
                ℹ️ Audit logs will be preserved for compliance
              </li>
            </ul>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Type{' '}
                <code className="rounded bg-gray-100 px-1 text-sm">
                  {expectedConfirmation}
                </code>{' '}
                to confirm deletion:
              </label>
              <Input
                type="text"
                value={confirmationText}
                onChange={e => setConfirmationText(e.target.value)}
                placeholder={`Type "${expectedConfirmation}" here`}
                className={` ${isConfirmationValid ? 'border-green-300 focus:border-green-500' : 'border-red-300 focus:border-red-500'} `}
                disabled={isDeleting}
              />
              {confirmationText && !isConfirmationValid && (
                <p className="mt-1 text-sm text-red-600">
                  Confirmation text does not match. Please type exactly:{' '}
                  {expectedConfirmation}
                </p>
              )}
            </div>

            {/* Final confirmation checkbox */}
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={finalConfirmation}
                onChange={e => setFinalConfirmation(e.target.checked)}
                className="mt-1"
                disabled={isDeleting}
              />
              <span className="text-sm text-gray-700">
                I understand that this action is permanent and cannot be undone.
                I confirm that I want to delete this user account and all
                associated data.
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={!canDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User Permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
