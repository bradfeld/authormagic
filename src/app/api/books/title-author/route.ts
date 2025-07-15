import { NextRequest, NextResponse } from 'next/server';

import { isbnDbService } from '@/lib/services/isbn-db.service';
import { convertISBNDBToUIBook } from '@/lib/types/ui-book';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const author = searchParams.get('author');

    if (!title || !author) {
      return NextResponse.json(
        { error: 'Both title and author parameters are required' },
        { status: 400 },
      );
    }

    // Request more comprehensive results - increase pageSize to get more books
    // The user expects 13 books for "Startup Communities" and 26 for "Venture Deals"
    const result = await isbnDbService.searchTitleAuthor(
      title.trim(),
      author.trim(),
      1,
      50,
    );

    if (result.success && result.data) {
      // Convert ISBNDB response to UIBook format
      const uiBooks = result.data.map(convertISBNDBToUIBook);

      return NextResponse.json({
        success: true,
        books: uiBooks,
        source: 'isbndb',
        total: uiBooks.length,
        searchParams: {
          title: title.trim() || null,
          author: author.trim() || null,
        },
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'No books found' },
        { status: 404 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
