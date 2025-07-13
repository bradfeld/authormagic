import { NextRequest, NextResponse } from 'next/server';
import { bookDataService } from '@/lib/services/book-data.service';

export async function GET(request: NextRequest, { params }: { params: { isbn: string } }) {
  try {
    const isbn = params.isbn;
    
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

    // Use book data service to get comprehensive book information
    const result = await bookDataService.getBookByISBN(cleanIsbn);
    
    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        books: [result.data], // Return as array to match frontend expectations
        source: result.data.source,
        total: 1,
        searchParams: {
          isbn: cleanIsbn
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'No book found with this ISBN',
          source: 'isbn-lookup',
          searchParams: {
            isbn: cleanIsbn
          }
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('ISBN lookup API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        source: 'isbn-lookup'
      },
      { status: 500 }
    );
  }
} 