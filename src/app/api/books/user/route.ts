import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { BookService } from '@/lib/services/book.service';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's books using the simplified method
    const userBooks = await BookService.getUserBooksSimplified(userId);

    return NextResponse.json({ books: userBooks });
  } catch (error) {
    console.error('Error fetching user books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 },
    );
  }
}
