import { NextRequest, NextResponse } from 'next/server';
import ISBNDBService from '@/lib/services/isbn-db.service';
import { convertISBNDBToUIBook } from '@/lib/types/ui-book';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ isbn: string }> }
) {
  try {
    const { isbn } = await params;
    
    if (!isbn) {
      return NextResponse.json(
        { error: 'ISBN is required' },
        { status: 400 }
      );
    }

    console.log(`Searching for ISBN: "${isbn}"`);
    
    // Create service instance
    const isbnService = new ISBNDBService();
    const result = await isbnService.getBookByISBN(isbn);
    
    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to find book' },
        { status: 404 }
      );
    }

    // Convert to UI format
    const uiBook = convertISBNDBToUIBook(result.data);
    
    return NextResponse.json({
      success: true,
      books: [uiBook], // Return as array for consistency with other endpoints
      total: 1,
      source: 'isbn_db'
    });
  } catch (error) {
    console.error('ISBN search error:', error);
    return NextResponse.json(
      { error: 'Failed to search books' },
      { status: 500 }
    );
  }
} 