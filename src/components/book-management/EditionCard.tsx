'use client';

import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookEdition } from '@/lib/types/book';

import { DeleteEditionDialog } from './DeleteEditionDialog';
import { EditEditionDialog } from './EditEditionDialog';

interface EditionCardProps {
  edition: BookEdition;
  onEditionUpdated?: (updatedEdition: BookEdition) => void;
  onEditionDeleted?: (editionId: string) => void;
}

export function EditionCard({
  edition,
  onEditionUpdated,
  onEditionDeleted,
}: EditionCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleEditEdition = async (
    editionNumber: number,
    publicationYear?: number,
  ) => {
    try {
      const response = await fetch(`/api/books/editions/${edition.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          edition_number: editionNumber,
          publication_year: publicationYear,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update edition');
      }

      const data = await response.json();
      if (onEditionUpdated) {
        onEditionUpdated(data.data.edition);
      }
    } catch (err) {
      throw err; // Re-throw so the dialog can handle it
    }
  };

  const handleDeleteEdition = async () => {
    try {
      const response = await fetch(`/api/books/editions/${edition.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete edition');
      }

      if (onEditionDeleted) {
        onEditionDeleted(edition.id);
      }
    } catch (err) {
      throw err; // Re-throw so the dialog can handle it
    }
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
                Edit Edition
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Edition
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {edition.edition_number
                ? `${edition.edition_number}${getOrdinalSuffix(edition.edition_number)} Edition`
                : 'Edition'}
            </span>
            {edition.publication_year && (
              <Badge variant="secondary">{edition.publication_year}</Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {edition.bindings && edition.bindings.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">
                Available Formats:
              </h4>
              <div className="grid gap-3">
                {edition.bindings.map(binding => (
                  <div
                    key={binding.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium capitalize">
                          {binding.binding_type.replace('_', ' ')}
                        </div>
                        {binding.isbn && (
                          <div className="text-xs text-gray-500">
                            ISBN: {binding.isbn}
                          </div>
                        )}
                        {binding.publisher && (
                          <div className="text-xs text-gray-500">
                            Publisher: {binding.publisher}
                          </div>
                        )}
                      </div>
                      {binding.price && (
                        <div className="text-sm font-medium text-green-600">
                          ${binding.price.toFixed(2)}
                        </div>
                      )}
                    </div>
                    {binding.pages && (
                      <div className="mt-1 text-xs text-gray-500">
                        {binding.pages} pages
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No format information available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditEditionDialog
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEditEdition}
        edition={edition}
      />

      {/* Delete Dialog */}
      <DeleteEditionDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteEdition}
        edition={edition}
      />
    </>
  );
}
