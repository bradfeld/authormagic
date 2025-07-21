import { auth, clerkClient } from '@clerk/nextjs/server';

// Author-specific metadata interface
export interface AuthorMetadata {
  bio?: string | null;
  website_url?: string | null;
  twitter_username?: string | null;
  linkedin_url?: string | null;
  facebook_url?: string | null;
  github_username?: string | null;
  goodreads_url?: string | null;
  amazon_author_url?: string | null;
}

// Get current user's author metadata
export async function getCurrentUserAuthorMetadata(): Promise<AuthorMetadata> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('No authenticated user found');
  }

  return await getUserAuthorMetadata(userId);
}

// Get author metadata for any user
export async function getUserAuthorMetadata(
  userId: string,
): Promise<AuthorMetadata> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Extract author-specific metadata
    const authorMetadata: AuthorMetadata = {
      bio: (user.publicMetadata.bio as string) || null,
      website_url: (user.publicMetadata.website_url as string) || null,
      twitter_username:
        (user.publicMetadata.twitter_username as string) || null,
      linkedin_url: (user.publicMetadata.linkedin_url as string) || null,
      facebook_url: (user.publicMetadata.facebook_url as string) || null,
      github_username: (user.publicMetadata.github_username as string) || null,
      goodreads_url: (user.publicMetadata.goodreads_url as string) || null,
      amazon_author_url:
        (user.publicMetadata.amazon_author_url as string) || null,
    };

    return authorMetadata;
  } catch (error) {
    throw error;
  }
}

// Update current user's author metadata
export async function updateCurrentUserAuthorMetadata(
  updates: Partial<AuthorMetadata>,
): Promise<AuthorMetadata> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('No authenticated user found');
  }

  return await updateUserAuthorMetadata(userId, updates);
}

// Update author metadata for any user
export async function updateUserAuthorMetadata(
  userId: string,
  updates: Partial<AuthorMetadata>,
): Promise<AuthorMetadata> {
  try {
    // Get current metadata
    const currentMetadata = await getUserAuthorMetadata(userId);

    // Merge updates with current metadata
    const updatedMetadata: AuthorMetadata = {
      ...currentMetadata,
      ...updates,
    };

    // Update user's public metadata
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...updatedMetadata,
      },
    });

    // CRITICAL: Verify what Clerk actually stored
    const verificationMetadata = await getUserAuthorMetadata(userId);

    // Debug: Compare what we sent vs what Clerk stored
    console.log('🔍 Clerk Update Verification:');
    console.log(
      '  📤 Sent twitter_username:',
      updatedMetadata.twitter_username,
    );
    console.log(
      '  📥 Clerk stored twitter_username:',
      verificationMetadata.twitter_username,
    );
    console.log('  📤 Sent bio:', updatedMetadata.bio);
    console.log('  📥 Clerk stored bio:', verificationMetadata.bio);

    // Return what Clerk actually stored (not our local merge)
    return verificationMetadata;
  } catch (error) {
    throw error;
  }
}

// Initialize author metadata for a new user
export async function initializeUserAuthorMetadata(
  userId: string,
  initialData: Partial<AuthorMetadata> = {},
): Promise<AuthorMetadata> {
  const defaultMetadata: AuthorMetadata = {
    bio: null,
    website_url: null,
    twitter_username: null,
    linkedin_url: null,
    facebook_url: null,
    github_username: null,
    goodreads_url: null,
    amazon_author_url: null,
    ...initialData,
  };

  return await updateUserAuthorMetadata(userId, defaultMetadata);
}

// Migration helper: Move data from Supabase to Clerk metadata
export async function migrateSupabaseAuthorToClerkMetadata(
  userId: string,
  supabaseData: {
    bio?: string | null;
    website_url?: string | null;
    twitter_username?: string | null;
    linkedin_url?: string | null;
    facebook_url?: string | null;
    github_username?: string | null;
    goodreads_url?: string | null;
    amazon_author_url?: string | null;
  },
): Promise<AuthorMetadata> {
  // Only migrate non-null values
  const metadataToMigrate: Partial<AuthorMetadata> = {};

  if (supabaseData.bio) metadataToMigrate.bio = supabaseData.bio;
  if (supabaseData.website_url)
    metadataToMigrate.website_url = supabaseData.website_url;
  if (supabaseData.twitter_username)
    metadataToMigrate.twitter_username = supabaseData.twitter_username;
  if (supabaseData.linkedin_url)
    metadataToMigrate.linkedin_url = supabaseData.linkedin_url;
  if (supabaseData.facebook_url)
    metadataToMigrate.facebook_url = supabaseData.facebook_url;
  if (supabaseData.github_username)
    metadataToMigrate.github_username = supabaseData.github_username;
  if (supabaseData.goodreads_url)
    metadataToMigrate.goodreads_url = supabaseData.goodreads_url;
  if (supabaseData.amazon_author_url)
    metadataToMigrate.amazon_author_url = supabaseData.amazon_author_url;

  return await updateUserAuthorMetadata(userId, metadataToMigrate);
}

// Get formatted author metadata for display
export function getFormattedAuthorMetadata(metadata: AuthorMetadata): {
  bio: string;
  website_url: string;
  social_links: Array<{
    platform: string;
    url: string;
    username?: string;
  }>;
} {
  const social_links = [];

  if (metadata.twitter_username) {
    social_links.push({
      platform: 'X',
      url: `https://x.com/${metadata.twitter_username}`,
      username: metadata.twitter_username,
    });
  }

  if (metadata.github_username) {
    social_links.push({
      platform: 'GitHub',
      url: `https://github.com/${metadata.github_username}`,
      username: metadata.github_username,
    });
  }

  if (metadata.linkedin_url) {
    social_links.push({
      platform: 'LinkedIn',
      url: metadata.linkedin_url,
    });
  }

  if (metadata.facebook_url) {
    social_links.push({
      platform: 'Facebook',
      url: metadata.facebook_url,
    });
  }

  if (metadata.goodreads_url) {
    social_links.push({
      platform: 'Goodreads',
      url: metadata.goodreads_url,
    });
  }

  if (metadata.amazon_author_url) {
    social_links.push({
      platform: 'Amazon Author',
      url: metadata.amazon_author_url,
    });
  }

  return {
    bio: metadata.bio || '',
    website_url: metadata.website_url || '',
    social_links,
  };
}
