'use client';

import {
  Edit,
  Book,
  DollarSign,
  FileText,
  Globe,
  ImageIcon,
  Hash,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BookBinding } from '@/lib/types/book';

interface EditBindingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (bindingData: {
    // Removed isbn since it's now read-only
    binding_type: string;
    price?: number;
    publisher?: string;
    cover_image_url?: string;
    description?: string;
    pages?: number;
    language: string;
  }) => Promise<void>;
  binding: BookBinding;
}

const BINDING_TYPES = [
  { value: 'hardcover', label: 'Hardcover' },
  { value: 'paperback', label: 'Paperback' },
  { value: 'ebook', label: 'E-book' },
  { value: 'audiobook', label: 'Audiobook' },
  { value: 'mass_market', label: 'Mass Market Paperback' },
  { value: 'trade_paperback', label: 'Trade Paperback' },
  { value: 'other', label: 'Other' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'other', label: 'Other' },
];

export function EditBindingDialog({
  isOpen,
  onOpenChange,
  onSave,
  binding,
}: EditBindingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isbn, setIsbn] = useState(binding.isbn || '');
  const [bindingType, setBindingType] = useState(binding.binding_type);
  const [price, setPrice] = useState(binding.price?.toString() || '');
  const [publisher, setPublisher] = useState(binding.publisher || '');
  const [coverImageUrl, setCoverImageUrl] = useState(
    binding.cover_image_url || '',
  );
  const [description, setDescription] = useState(binding.description || '');
  const [pages, setPages] = useState(binding.pages?.toString() || '');
  const [language, setLanguage] = useState(binding.language);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens/closes
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsbn(binding.isbn || '');
      setBindingType(binding.binding_type);
      setPrice(binding.price?.toString() || '');
      setPublisher(binding.publisher || '');
      setCoverImageUrl(binding.cover_image_url || '');
      setDescription(binding.description || '');
      setPages(binding.pages?.toString() || '');
      setLanguage(binding.language);
      setErrors({});
    } else {
      onOpenChange(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate binding type (required)
    if (!bindingType) {
      newErrors.bindingType = 'Binding type is required';
    }

    // Validate language (required)
    if (!language) {
      newErrors.language = 'Language is required';
    }

    // Validate price if provided
    if (price.trim()) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0 || priceNum > 99999.99) {
        newErrors.price = 'Price must be a number between 0 and 99999.99';
      }
    }

    // Validate pages if provided
    if (pages.trim()) {
      const pagesNum = parseInt(pages, 10);
      if (isNaN(pagesNum) || pagesNum < 1 || pagesNum > 99999) {
        newErrors.pages = 'Pages must be a number between 1 and 99999';
      }
    }

    // Validate field lengths (removed ISBN validation since it's read-only)
    if (publisher && publisher.length > 200) {
      newErrors.publisher = 'Publisher must be 200 characters or less';
    }

    if (coverImageUrl && coverImageUrl.length > 500) {
      newErrors.coverImageUrl =
        'Cover image URL must be 500 characters or less';
    }

    if (description && description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const bindingData = {
      // ISBN is excluded since it's read-only
      binding_type: bindingType,
      price: price.trim() ? parseFloat(price) : undefined,
      publisher: publisher.trim() || undefined,
      cover_image_url: coverImageUrl.trim() || undefined,
      description: description.trim() || undefined,
      pages: pages.trim() ? parseInt(pages, 10) : undefined,
      language,
    };

    // Check if anything actually changed (excluding ISBN since it's read-only)
    const hasChanges =
      bindingData.binding_type !== binding.binding_type ||
      bindingData.price !== binding.price ||
      bindingData.publisher !== binding.publisher ||
      bindingData.cover_image_url !== binding.cover_image_url ||
      bindingData.description !== binding.description ||
      bindingData.pages !== binding.pages ||
      bindingData.language !== binding.language;

    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(bindingData);
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

  const getBindingTypeLabel = (value: string) => {
    const type = BINDING_TYPES.find(t => t.value === value);
    return type ? type.label : value;
  };

  const isChanged =
    // Removed ISBN from change detection since it's read-only
    bindingType !== binding.binding_type ||
    price !== (binding.price?.toString() || '') ||
    publisher !== (binding.publisher || '') ||
    coverImageUrl !== (binding.cover_image_url || '') ||
    description !== (binding.description || '') ||
    pages !== (binding.pages?.toString() || '') ||
    language !== binding.language;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <Edit className="h-5 w-5" />
            Edit {getBindingTypeLabel(binding.binding_type)} Format
          </DialogTitle>
          <DialogDescription>
            Update the metadata and details for this book format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Binding Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              <Book className="mr-2 inline h-4 w-4" />
              Format Type *
            </label>
            <Select
              value={bindingType}
              onValueChange={setBindingType}
              disabled={isLoading}
            >
              <SelectTrigger
                className={errors.bindingType ? 'border-red-300' : ''}
              >
                <SelectValue placeholder="Select format type" />
              </SelectTrigger>
              <SelectContent>
                {BINDING_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bindingType && (
              <p className="text-sm text-red-600">{errors.bindingType}</p>
            )}
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              <Globe className="mr-2 inline h-4 w-4" />
              Language *
            </label>
            <Select
              value={language}
              onValueChange={setLanguage}
              disabled={isLoading}
            >
              <SelectTrigger
                className={errors.language ? 'border-red-300' : ''}
              >
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.language && (
              <p className="text-sm text-red-600">{errors.language}</p>
            )}
          </div>

          {/* ISBN */}
          <div className="space-y-2">
            <label htmlFor="isbn" className="text-sm font-medium">
              <Hash className="mr-2 inline h-4 w-4" />
              ISBN
            </label>
            <Input
              id="isbn"
              value={isbn}
              placeholder="978-0-123456-78-9"
              className={`${errors.isbn ? 'border-red-300' : ''} placeholder:text-gray-400`}
              disabled={true}
              maxLength={20}
              readOnly
            />
            {errors.isbn && (
              <p className="text-sm text-red-600">{errors.isbn}</p>
            )}
            <p className="text-xs text-gray-500">
              ISBN is automatically assigned and cannot be edited
            </p>
          </div>

          {/* Publisher */}
          <div className="space-y-2">
            <label htmlFor="publisher" className="text-sm font-medium">
              Publisher
            </label>
            <Input
              id="publisher"
              value={publisher}
              onChange={e => setPublisher(e.target.value)}
              placeholder="e.g., Penguin Random House"
              className={`${errors.publisher ? 'border-red-300' : ''} placeholder:text-gray-400`}
              disabled={isLoading}
              maxLength={200}
            />
            {errors.publisher && (
              <p className="text-sm text-red-600">{errors.publisher}</p>
            )}
            <p className="text-xs text-gray-500">
              {publisher.length}/200 characters
            </p>
          </div>

          {/* Price and Pages Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium">
                <DollarSign className="mr-2 inline h-4 w-4" />
                Price
              </label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="19.99"
                className={`${errors.price ? 'border-red-300' : ''} placeholder:text-gray-400`}
                disabled={isLoading}
                min={0}
                max={99999.99}
                step={0.01}
              />
              {errors.price && (
                <p className="text-sm text-red-600">{errors.price}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="pages" className="text-sm font-medium">
                <FileText className="mr-2 inline h-4 w-4" />
                Pages
              </label>
              <Input
                id="pages"
                type="number"
                value={pages}
                onChange={e => setPages(e.target.value)}
                placeholder="350"
                className={`${errors.pages ? 'border-red-300' : ''} placeholder:text-gray-400`}
                disabled={isLoading}
                min={1}
                max={99999}
              />
              {errors.pages && (
                <p className="text-sm text-red-600">{errors.pages}</p>
              )}
            </div>
          </div>

          {/* Cover Image URL */}
          <div className="space-y-2">
            <label htmlFor="coverImageUrl" className="text-sm font-medium">
              <ImageIcon className="mr-2 inline h-4 w-4" />
              Cover Image URL
            </label>
            <Input
              id="coverImageUrl"
              value={coverImageUrl}
              onChange={e => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/cover.jpg"
              className={`${errors.coverImageUrl ? 'border-red-300' : ''} placeholder:text-gray-400`}
              disabled={isLoading}
              maxLength={500}
            />
            {errors.coverImageUrl && (
              <p className="text-sm text-red-600">{errors.coverImageUrl}</p>
            )}
            <p className="text-xs text-gray-500">
              {coverImageUrl.length}/500 characters
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional notes or description for this format..."
              className={`${errors.description ? 'border-red-300' : ''} placeholder:text-gray-400`}
              disabled={isLoading}
              maxLength={2000}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500">
              {description.length}/2000 characters
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !isChanged || !bindingType || !language}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
