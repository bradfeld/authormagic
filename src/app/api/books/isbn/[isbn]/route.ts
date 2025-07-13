import { NextRequest, NextResponse } from 'next/server';
import { isbnDbService } from '@/lib/services/isbn-db.service';
import { convertISBNDBToUIBook } from '@/lib/types/ui-book';

export async function GET(request: NextRequest, { params }: { params: Promise<{ isbn: string }> }) {
  try {
    // Await params to fix Next.js 15 async params issue
    const { isbn } = await params;
    
    // Validate ISBN format
    if (!isbn || isbn.length < 10) {
      return NextResponse.json(
        { error: 'Invalid ISBN provided' },
        { status: 400 }
      );
    }

    // Clean the ISBN (remove any non-alphanumeric characters)
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    
    if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
      return NextResponse.json(
        { error: 'ISBN must be 10 or 13 characters long' },
        { status: 400 }
      );
    }

    console.log(`Searching for ISBN: ${cleanIsbn}`);

    // Use ISBN DB service to get book data
    const result = await isbnDbService.getBookByISBN(cleanIsbn);

    if (result.success && result.data) {
      // Convert ISBNDB response to UIBook format
      const uiBook = convertISBNDBToUIBook(result.data);
      
      return NextResponse.json({
        success: true,
        books: [uiBook], // Return as array to match expected format
        source: 'isbndb',
        total: 1,
        searchParams: {
          isbn: cleanIsbn
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        books: [],
        error: result.error || 'Book not found',
        source: 'isbndb',
        total: 0,
        searchParams: {
          isbn: cleanIsbn
        }
      });
    }
  } catch (error) {
    console.error('Error in ISBN API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 