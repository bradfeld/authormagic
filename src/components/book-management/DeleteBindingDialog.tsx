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
import { BookBinding } from '@/lib/types/book';

interface DeleteBindingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  binding: BookBinding;
}

const BINDING_TYPE_LABELS: Record<string, string> = {
  hardcover: 'Hardcover',
  paperback: 'Paperback',
  ebook: 'E-book',
  audiobook: 'Audiobook',
  mass_market: 'Mass Market Paperback',
  trade_paperback: 'Trade Paperback',
  other: 'Other',
};

export function DeleteBindingDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  binding,
}: DeleteBindingDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const bindingDisplayName =
    BINDING_TYPE_LABELS[binding.binding_type] || binding.binding_type;
  const expectedConfirmation = bindingDisplayName;

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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Format
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the{' '}
            {bindingDisplayName} format and all its associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h4 className="font-medium text-red-800">What will be deleted:</h4>
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              <li>• The {bindingDisplayName} format</li>
              {binding.isbn && <li>• ISBN: {binding.isbn}</li>}
              {binding.publisher && <li>• Publisher: {binding.publisher}</li>}
              {binding.price && <li>• Price: ${binding.price.toFixed(2)}</li>}
              {binding.pages && <li>• Page count: {binding.pages}</li>}
              {binding.cover_image_url && <li>• Cover image</li>}
              {binding.description && <li>• Description and notes</li>}
              <li>• All associated metadata</li>
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
            {isDeleting ? 'Deleting...' : 'Delete Format'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
