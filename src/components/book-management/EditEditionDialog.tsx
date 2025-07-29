'use client';

import { Edit, Hash, Calendar } from 'lucide-react';
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

interface EditEditionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (editionNumber: number, publicationYear?: number) => Promise<void>;
  edition: BookEdition;
}

export function EditEditionDialog({
  isOpen,
  onOpenChange,
  onSave,
  edition,
}: EditEditionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [editionNumber, setEditionNumber] = useState(
    edition.edition_number.toString(),
  );
  const [publicationYear, setPublicationYear] = useState(
    edition.publication_year?.toString() || '',
  );
  const [errors, setErrors] = useState<{
    editionNumber?: string;
    publicationYear?: string;
  }>({});

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEditionNumber(edition.edition_number.toString());
      setPublicationYear(edition.publication_year?.toString() || '');
      setErrors({});
    } else {
      onOpenChange(false);
    }
  };

  const validateForm = () => {
    const newErrors: { editionNumber?: string; publicationYear?: string } = {};

    // Validate edition number
    const editionNum = parseInt(editionNumber, 10);
    if (!editionNumber.trim() || isNaN(editionNum)) {
      newErrors.editionNumber = 'Edition number is required';
    } else if (editionNum < 1 || editionNum > 999) {
      newErrors.editionNumber = 'Edition number must be between 1 and 999';
    }

    // Validate publication year if provided
    if (publicationYear.trim()) {
      const year = parseInt(publicationYear, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year)) {
        newErrors.publicationYear = 'Publication year must be a valid number';
      } else if (year < 1000 || year > currentYear + 10) {
        newErrors.publicationYear = `Publication year must be between 1000 and ${currentYear + 10}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const newEditionNumber = parseInt(editionNumber, 10);
    const newPublicationYear = publicationYear.trim()
      ? parseInt(publicationYear, 10)
      : undefined;

    // Check if anything actually changed
    if (
      newEditionNumber === edition.edition_number &&
      newPublicationYear === edition.publication_year
    ) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(newEditionNumber, newPublicationYear);
      onOpenChange(false);
    } catch {
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

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

  const isChanged =
    parseInt(editionNumber, 10) !== edition.edition_number ||
    (publicationYear.trim() ? parseInt(publicationYear, 10) : undefined) !==
      edition.publication_year;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Edit className="h-5 w-5" />
            Edit Edition Information
          </DialogTitle>
          <DialogDescription>
            Update the edition number and publication year for this edition.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="editionNumber" className="text-sm font-medium">
              <Hash className="mr-2 inline h-4 w-4" />
              Edition Number *
            </label>
            <Input
              id="editionNumber"
              type="number"
              value={editionNumber}
              onChange={e => setEditionNumber(e.target.value)}
              placeholder="1"
              className={errors.editionNumber ? 'border-red-300' : ''}
              disabled={isLoading}
              min={1}
              max={999}
            />
            {errors.editionNumber && (
              <p className="text-sm text-red-600">{errors.editionNumber}</p>
            )}
            {!errors.editionNumber &&
              editionNumber &&
              !isNaN(parseInt(editionNumber, 10)) && (
                <p className="text-xs text-gray-500">
                  Will display as: {parseInt(editionNumber, 10)}
                  {getOrdinalSuffix(parseInt(editionNumber, 10))} Edition
                </p>
              )}
          </div>

          <div className="space-y-2">
            <label htmlFor="publicationYear" className="text-sm font-medium">
              <Calendar className="mr-2 inline h-4 w-4" />
              Publication Year
            </label>
            <Input
              id="publicationYear"
              type="number"
              value={publicationYear}
              onChange={e => setPublicationYear(e.target.value)}
              placeholder="e.g., 2023"
              className={errors.publicationYear ? 'border-red-300' : ''}
              disabled={isLoading}
              min={1000}
              max={new Date().getFullYear() + 10}
            />
            {errors.publicationYear && (
              <p className="text-sm text-red-600">{errors.publicationYear}</p>
            )}
            <p className="text-xs text-gray-500">
              Optional - leave blank if unknown
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !isChanged || !editionNumber.trim()}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
