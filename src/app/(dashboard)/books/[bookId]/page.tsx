'use client';

import { useUser } from '@clerk/nextjs';
import { formatDistanceToNow } from 'date-fns';
import { Edit } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EditBookDialog } from '@/components/book-management/EditBookDialog';
import { EditionCard } from '@/components/book-management/EditionCard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Book } from '@/lib/types/book';

// CI-safe wrapper component
function BookDetailPageContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (user && isLoaded && bookId) {
      const fetchBookDetails = async () => {
        setLoading(true);
        setError(null);

        try {
          const response = await fetch(`/api/books/${bookId}`);

          if (!response.ok) {
            if (response.status === 404) {
              setError('Book not found');
            } else {
              throw new Error('Failed to fetch book details');
            }
            return;
          }

          const data = await response.json();
          setBook(data.data.book);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setLoading(false);
        }
      };

      fetchBookDetails();
    }
  }, [user, isLoaded, bookId]);

  const handleEditBook = async (title: string, author: string) => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, author }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update book');
      }

      const data = await response.json();
      setBook(data.data.book);
    } catch (err) {
      throw err; // Re-throw so the dialog can handle it
    }
  };

  if (!isLoaded || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="animate-pulse">
            <div className="mb-6 h-4 w-1/4 rounded bg-gray-200"></div>
            <div className="flex gap-8">
              <div className="h-64 w-44 rounded-lg bg-gray-200"></div>
              <div className="flex-1 space-y-4">
                <div className="h-8 w-3/4 rounded bg-gray-200"></div>
                <div className="h-6 w-1/2 rounded bg-gray-200"></div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 rounded bg-gray-200"></div>
                  <div className="h-6 w-16 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null; // Redirecting
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Breadcrumb
            items={[{ label: 'Books', href: '/books' }, { label: 'Error' }]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Error Loading Book</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Only show "Book Not Found" if we finished loading and have no book data
  if (!loading && !book) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Breadcrumb
            items={[{ label: 'Books', href: '/books' }, { label: 'Not Found' }]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Book Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                The book you&apos;re looking for could not be found.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Type guard: at this point, book should be loaded and not null
  if (!book) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Breadcrumb
            items={[
              { label: 'Books', href: '/books' },
              { label: 'Loading...' },
            ]}
          />
          <div className="animate-pulse">
            <div className="mb-6 h-4 w-1/4 rounded bg-gray-200"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate statistics
  const totalEditions = book.editions?.length || 0;
  const totalBindings =
    book.editions?.reduce(
      (total, edition) => total + (edition.bindings?.length || 0),
      0,
    ) || 0;

  // Get year range
  const years = book.editions
    ?.map(e => e.publication_year)
    .filter(Boolean)
    .sort() as number[];
  const yearRange =
    years.length > 0
      ? years.length === 1
        ? years[0].toString()
        : `${years[0]} - ${years[years.length - 1]}`
      : null;

  // Get primary edition (first one or selected one)
  const primaryEdition = book.selected_edition_id
    ? book.editions?.find(e => e.id === book.selected_edition_id)
    : book.editions?.[0];

  // Get cover image from primary edition's first binding with an image
  const coverImage = primaryEdition?.bindings?.find(
    b => b.cover_image_url,
  )?.cover_image_url;

  // Format the added date
  const addedDate = formatDistanceToNow(new Date(book.created_at), {
    addSuffix: true,
  });

  return (
    <>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Breadcrumb Navigation */}
          <Breadcrumb
            items={[{ label: 'Books', href: '/books' }, { label: book.title }]}
          />

          {/* Book Header */}
          <div className="flex gap-8">
            {/* Book Cover */}
            <div className="flex-shrink-0">
              <div className="relative h-64 w-44 overflow-hidden rounded-lg bg-gray-100 shadow-lg">
                {coverImage ? (
                  <Image
                    src={coverImage}
                    alt={`Cover of ${book.title}`}
                    fill
                    className="object-cover"
                    sizes="176px"
                    onError={e => {
                      // Hide the broken image and show fallback
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      // Image loaded successfully
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                    <span className="text-4xl">📚</span>
                  </div>
                )}

                {/* Fallback for broken images */}
                {coverImage && (
                  <div
                    className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200"
                    style={{ zIndex: -1 }}
                  >
                    <span className="text-4xl">📚</span>
                  </div>
                )}
              </div>
            </div>

            {/* Book Information */}
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-start justify-between">
                <h1 className="mr-4 text-3xl font-bold text-gray-900">
                  {book.title}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </div>
              <p className="mb-4 text-xl text-gray-600">by {book.author}</p>

              {/* Statistics */}
              <div className="mb-6 flex flex-wrap gap-3">
                <Badge variant="secondary" className="px-3 py-1">
                  {totalEditions} {totalEditions === 1 ? 'edition' : 'editions'}
                </Badge>
                <Badge variant="secondary" className="px-3 py-1">
                  {totalBindings} {totalBindings === 1 ? 'format' : 'formats'}
                </Badge>
                {yearRange && (
                  <Badge variant="outline" className="px-3 py-1">
                    {yearRange}
                  </Badge>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-1 text-sm text-gray-500">
                <p>Added to collection {addedDate}</p>
                {primaryEdition && (
                  <p>
                    Primary edition:{' '}
                    {primaryEdition.edition_number
                      ? `${primaryEdition.edition_number}${getOrdinalSuffix(primaryEdition.edition_number)} Edition`
                      : 'Unknown edition'}
                    {primaryEdition.publication_year &&
                      ` (${primaryEdition.publication_year})`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Editions Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">Editions</h2>

            {book.editions && book.editions.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {book.editions.map(edition => (
                  <EditionCard key={edition.id} edition={edition} />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Editions Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    This book doesn&apos;t have any edition information
                    available yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DashboardLayout>

      {/* Edit Dialog */}
      <EditBookDialog
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        book={book}
        onSave={handleEditBook}
      />
    </>
  );
}

export default function BookDetailPage() {
  // Handle CI builds where Clerk is disabled
  const isCI = process.env.NEXT_PUBLIC_CI_DISABLE_CLERK === 'true';

  if (isCI) {
    // Return CI-safe version without Clerk hooks
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Breadcrumb
            items={[
              { label: 'Books', href: '/books' },
              { label: 'Sample Book' },
            ]}
          />
          <div className="flex gap-8">
            <div className="h-64 w-44 rounded-lg bg-gray-200"></div>
            <div className="flex-1">
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                Sample Book Title
              </h1>
              <p className="mb-4 text-xl text-gray-600">by Sample Author</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Return normal component with Clerk hooks for non-CI builds
  return <BookDetailPageContent />;
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(num: number): string {
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
}
