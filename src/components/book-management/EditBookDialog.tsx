'use client';

import { Edit, Book } from 'lucide-react';
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

interface EditBookDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string, author: string) => Promise<void>;
  book: {
    id: string;
    title: string;
    author: string;
  };
}

export function EditBookDialog({
  isOpen,
  onOpenChange,
  onSave,
  book,
}: EditBookDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [errors, setErrors] = useState<{ title?: string; author?: string }>({});

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTitle(book.title);
      setAuthor(book.author);
      setErrors({});
    } else {
      onOpenChange(false);
    }
  };

  const validateForm = () => {
    const newErrors: { title?: string; author?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 500) {
      newErrors.title = 'Title must be 500 characters or less';
    }

    if (!author.trim()) {
      newErrors.author = 'Author is required';
    } else if (author.length > 200) {
      newErrors.author = 'Author must be 200 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // Check if anything actually changed
    if (title.trim() === book.title && author.trim() === book.author) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(title.trim(), author.trim());
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

  const isChanged = title !== book.title || author !== book.author;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Edit className="h-5 w-5" />
            Edit Book Information
          </DialogTitle>
          <DialogDescription>
            Update the title and author information for this book.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              <Book className="mr-2 inline h-4 w-4" />
              Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter book title"
              className={errors.title ? 'border-red-300' : ''}
              disabled={isLoading}
              maxLength={500}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
            <p className="text-xs text-gray-500">
              {title.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="author" className="text-sm font-medium">
              Author *
            </label>
            <Input
              id="author"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Enter author name"
              className={errors.author ? 'border-red-300' : ''}
              disabled={isLoading}
              maxLength={200}
            />
            {errors.author && (
              <p className="text-sm text-red-600">{errors.author}</p>
            )}
            <p className="text-xs text-gray-500">
              {author.length}/200 characters
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isLoading || !isChanged || !title.trim() || !author.trim()
            }
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
