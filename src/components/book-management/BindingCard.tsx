'use client';

import {
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  FileText,
  Hash,
  Globe,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookBinding } from '@/lib/types/book';

import { DeleteBindingDialog } from './DeleteBindingDialog';
import { EditBindingDialog } from './EditBindingDialog';

interface BindingCardProps {
  binding: BookBinding;
  onBindingUpdated?: (updatedBinding: BookBinding) => void;
  onBindingDeleted?: (bindingId: string) => void;
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

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  other: 'Other',
};

export function BindingCard({
  binding,
  onBindingUpdated,
  onBindingDeleted,
}: BindingCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleEditBinding = async (bindingData: {
    // Removed isbn since it's now read-only
    binding_type: string;
    price?: number;
    publisher?: string;
    cover_image_url?: string;
    description?: string;
    pages?: number;
    language: string;
  }) => {
    try {
      const response = await fetch(`/api/books/bindings/${binding.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bindingData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update binding');
      }

      const data = await response.json();
      if (onBindingUpdated) {
        onBindingUpdated(data.data.binding);
      }
    } catch (err) {
      throw err; // Re-throw so the dialog can handle it
    }
  };

  const handleDeleteBinding = async () => {
    try {
      const response = await fetch(`/api/books/bindings/${binding.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete binding');
      }

      if (onBindingDeleted) {
        onBindingDeleted(binding.id);
      }
    } catch (err) {
      throw err; // Re-throw so the dialog can handle it
    }
  };

  const bindingTypeLabel =
    BINDING_TYPE_LABELS[binding.binding_type] || binding.binding_type;
  const languageLabel = LANGUAGE_LABELS[binding.language] || binding.language;

  return (
    <>
      <Card className="group relative transition-shadow hover:shadow-md">
        <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setEditDialogOpen(true)}
                className="text-blue-600 focus:text-blue-600"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Format
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Format
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardHeader>
          <CardTitle className="text-lg font-semibold capitalize">
            {bindingTypeLabel}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Primary Info */}
          <div className="space-y-2">
            {binding.isbn && (
              <div className="flex items-center text-sm text-gray-600">
                <Hash className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="font-mono">{binding.isbn}</span>
              </div>
            )}

            {binding.publisher && (
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2 font-medium">Publisher:</span>
                <span>{binding.publisher}</span>
              </div>
            )}

            <div className="flex items-center text-sm text-gray-600">
              <Globe className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{languageLabel}</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {binding.price && (
                <div className="flex items-center text-sm font-medium text-green-600">
                  <DollarSign className="mr-1 h-4 w-4" />
                  <span>${binding.price.toFixed(2)}</span>
                </div>
              )}

              {binding.pages && (
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="mr-1 h-4 w-4" />
                  <span>{binding.pages} pages</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {binding.description && (
            <div className="border-t border-gray-100 pt-2">
              <p className="line-clamp-3 text-sm text-gray-600">
                {binding.description}
              </p>
            </div>
          )}

          {/* Cover Image Preview */}
          {binding.cover_image_url && (
            <div className="border-t border-gray-100 pt-2">
              <div className="mb-1 text-xs text-gray-500">Cover Image:</div>
              <div className="relative h-16 w-12 overflow-hidden rounded bg-gray-100">
                <Image
                  src={binding.cover_image_url}
                  alt={`${bindingTypeLabel} cover`}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditBindingDialog
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEditBinding}
        binding={binding}
      />

      {/* Delete Dialog */}
      <DeleteBindingDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteBinding}
        binding={binding}
      />
    </>
  );
}
