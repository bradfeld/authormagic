import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { AuthorProfileService } from '@/lib/services/author-profile.service';
import { AuthorMetadata } from '@/lib/utils/clerk-metadata';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const updates: Partial<AuthorMetadata> = await request.json();

    // Validate the updates
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { message: 'Invalid request body' },
        { status: 400 },
      );
    }

    // Initialize the author profile service
    const authorService = new AuthorProfileService();

    // Update the author metadata in Clerk
    await authorService.updateAuthorMetadata(userId, updates);

    // Get the complete updated profile
    const updatedProfile =
      await authorService.getCompleteProfileByClerkUserId(userId);

    if (!updatedProfile) {
      return NextResponse.json(
        { message: 'Profile not found after update' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
