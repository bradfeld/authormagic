import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { PrimaryBookService } from '@/lib/services/primary-book.service';

export async function POST(request: NextRequest) {
  try {
    // Get user authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { book, allEditionData } = body;

    if (!book) {
      return NextResponse.json(
        { error: 'Book data is required' },
        { status: 400 },
      );
    }

    // Extract title and author
    const title = book.title;
    const author = Array.isArray(book.authors)
      ? book.authors.join(', ')
      : book.authors || book.author || 'Unknown Author';

    // Use all edition data if provided, otherwise just the single book
    const searchResults =
      allEditionData && allEditionData.length > 0 ? allEditionData : [book];

    // Check if the book already exists
    const existingBook = await PrimaryBookService.findExistingBook(
      userId,
      title,
      author,
    );

    let primaryBook;
    let message;

    if (existingBook) {
      // Update existing book with new edition data
      primaryBook = await PrimaryBookService.updateBookWithNewEditions(
        existingBook.id,
        searchResults,
      );
      message = 'Book already in library - updated with latest edition data';
    } else {
      // Create new primary book
      primaryBook = await PrimaryBookService.createPrimaryBook(
        userId,
        title,
        author,
        searchResults,
      );
      message = 'Book added to library successfully';
    }

    return NextResponse.json({
      success: true,
      primaryBook,
      message,
      isUpdate: !!existingBook,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to add book to library',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
