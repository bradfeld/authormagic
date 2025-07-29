'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';

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

interface DeleteBookDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  bookTitle: string;
  bookId: string;
}

export function DeleteBookDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  bookTitle,
}: Omit<DeleteBookDialogProps, 'bookId'>) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const handleConfirm = async () => {
    if (confirmationText !== bookTitle) {
      return; // Button should be disabled, but double-check
    }

    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setConfirmationText('');
    } catch {
      // Silent error handling - could add toast notification here
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setConfirmationText('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Book
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the book
            &quot;{bookTitle}&quot; and all its editions and bindings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h4 className="font-medium text-red-800">What will be deleted:</h4>
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              <li>• The book &quot;{bookTitle}&quot;</li>
              <li>• All editions of this book</li>
              <li>• All bindings (hardcover, paperback, ebook, etc.)</li>
              <li>• All associated data and images</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmation" className="text-sm font-medium">
              Type the book title to confirm deletion:
            </label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={e => setConfirmationText(e.target.value)}
              placeholder={bookTitle}
              className="border-gray-300"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmationText !== bookTitle || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Book'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
