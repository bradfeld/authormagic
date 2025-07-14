import { NextRequest, NextResponse } from 'next/server';

import { bookDataService } from '@/lib/services/book-data.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ isbn: string }> },
): Promise<NextResponse> {
  const { isbn } = await params;

  if (!isbn) {
    return NextResponse.json({ error: 'ISBN is required' }, { status: 400 });
  }

  try {
    const result = await bookDataService.getBookByISBN(isbn);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
