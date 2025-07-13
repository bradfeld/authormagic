import { NextRequest, NextResponse } from 'next/server';
import { isbnDbService } from '@/lib/services/isbn-db.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    const author = searchParams.get('author');
    const maxResults = parseInt(searchParams.get('maxResults') || '10');
    
    // At least one of title or author must be provided
    if (!title && !author) {
      return NextResponse.json(
        { error: 'At least one of title or author parameter is required' },
        { status: 400 }
      );
    }

    // Validate inputs
    if (title && title.trim().length < 2) {
      return NextResponse.json(
        { error: 'Title must be at least 2 characters long' },
        { status: 400 }
      );
    }
    
    if (author && author.trim().length < 2) {
      return NextResponse.json(
        { error: 'Author name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    // Build combined search text for better ISBNDB results (like their website)
    const searchParts: string[] = [];
    
    if (title?.trim()) {
      searchParts.push(title.trim());
    }
    
    if (author?.trim()) {
      searchParts.push(author.trim());
    }

    // Use enhanced search method that tries multiple strategies
    let result;
    
    if (title && author) {
      // Use the new enhanced title+author search method
      result = await isbnDbService.searchTitleAuthor(title.trim(), author.trim(), 1, maxResults);
    } else if (title) {
      // Title-only search
      result = await isbnDbService.searchByText(title.trim(), 1, maxResults);
    } else if (author) {
      // Author-only search
      result = await isbnDbService.getBooksByAuthor(author.trim(), 1, maxResults);
    } else {
      return NextResponse.json(
        { error: 'At least one of title or author parameter is required' },
        { status: 400 }
      );
    }
    
    if (result.success && result.data) {
      return NextResponse.json({
        success: true,
        data: result.data,
        source: 'isbndb',
        total: result.data.length,
        searchParams: {
          title: title?.trim() || null,
          author: author?.trim() || null
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'No books found matching your search criteria',
          source: 'isbndb',
          searchParams: {
            title: title?.trim() || null,
            author: author?.trim() || null
          }
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Title+Author search API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        source: 'isbndb'
      },
      { status: 500 }
    );
  }
} 