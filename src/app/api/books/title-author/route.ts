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
        { status: 400 }
      );
    }

    console.log(`Searching for title: "${title}" by author: "${author}"`);

    // Use the enhanced search method that was working before
    const result = await isbnDbService.searchTitleAuthor(title.trim(), author.trim(), 1, 10);

    if (result.success && result.data) {
      // Convert ISBNDB response to UIBook format
      const uiBooks = result.data.map(book => convertISBNDBToUIBook(book));
      
      return NextResponse.json({
        success: true,
        books: uiBooks,
        source: 'isbndb',
        total: uiBooks.length,
        searchParams: {
          title: title?.trim() || null,
          author: author?.trim() || null
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        books: [],
        error: result.error || 'No books found',
        source: 'isbndb',
        total: 0,
        searchParams: {
          title: title?.trim() || null,
          author: author?.trim() || null
        }
      });
    }
  } catch (error) {
    console.error('Error in title-author API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 