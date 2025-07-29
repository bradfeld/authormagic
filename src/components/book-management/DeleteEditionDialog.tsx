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
import { BookEdition } from '@/lib/types/book';

interface DeleteEditionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  edition: BookEdition;
}

export function DeleteEditionDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  edition,
}: DeleteEditionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const getOrdinalSuffix = (num: number): string => {
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return 'th';
    }

    switch (lastDigit) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  const editionDisplayName = `${edition.edition_number}${getOrdinalSuffix(edition.edition_number)} Edition`;
  const expectedConfirmation = editionDisplayName;

  const handleConfirm = async () => {
    if (confirmationText !== expectedConfirmation) {
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

  const totalBindings = edition.bindings?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Edition
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the{' '}
            {editionDisplayName}
            {edition.publication_year && ` (${edition.publication_year})`} and
            all its formats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h4 className="font-medium text-red-800">What will be deleted:</h4>
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              <li>
                • The {editionDisplayName}
                {edition.publication_year && ` (${edition.publication_year})`}
              </li>
              <li>
                • All {totalBindings} format{totalBindings !== 1 ? 's' : ''}{' '}
                (hardcover, paperback, ebook, etc.)
              </li>
              <li>• All associated metadata and cover images</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmation" className="text-sm font-medium">
              Type &quot;{expectedConfirmation}&quot; to confirm deletion:
            </label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={e => setConfirmationText(e.target.value)}
              placeholder={expectedConfirmation}
              className="border-gray-300"
              disabled={isDeleting}
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
            disabled={confirmationText !== expectedConfirmation || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Edition'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
