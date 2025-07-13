import { NextRequest, NextResponse } from 'next/server';
import { BookDataService } from '@/lib/services/book-data.service';

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
    const result = await BookDataService.searchByISBN(isbn);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('ISBN search error:', error);
    return NextResponse.json(
      { error: 'Failed to search books' },
      { status: 500 }
    );
  }
} 