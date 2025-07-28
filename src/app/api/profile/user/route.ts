import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { AuthorProfileService } from '@/lib/services/author-profile.service';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authorService = new AuthorProfileService();

    // Get or create the complete author profile
    const profile = await authorService.getOrCreateProfile(userId);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
