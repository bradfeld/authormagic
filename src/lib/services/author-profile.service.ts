import { clerkClient } from '@clerk/nextjs/server';

import { Database } from '@/lib/database.types';
import { createServiceClient } from '@/lib/supabase/server';
import {
  AuthorMetadata,
  getUserAuthorMetadata,
  updateUserAuthorMetadata,
  initializeUserAuthorMetadata,
} from '@/lib/utils/clerk-metadata';

export type Author = Database['public']['Tables']['authors']['Row'];
type AuthorProfile = Database['public']['Tables']['authors']['Row'];

// Combined profile type that includes Clerk metadata
export interface CompleteAuthorProfile {
  // Supabase fields (minimal - just linking)
  id: string;
  clerk_user_id: string;
  created_at: string;
  updated_at: string;

  // Clerk basic profile data (primary source of truth)
  name: string;
  email: string;
  profile_image_url: string | null;

  // Clerk metadata (author-specific fields)
  bio: string | null;
  website_url: string | null;
  twitter_username: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  github_username: string | null;
  goodreads_url: string | null;
  amazon_author_url: string | null;
}

export class AuthorProfileService {
  private _supabase: ReturnType<typeof createServiceClient> | null = null;

  private getSupabase() {
    if (!this._supabase) {
      this._supabase = createServiceClient();
    }
    return this._supabase;
  }

  async getProfileByClerkUserId(
    clerkUserId: string,
  ): Promise<AuthorProfile | null> {
    try {
      const { data, error } = await this.getSupabase()
        .from('authors')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - profile doesn't exist yet
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async getCompleteProfileByClerkUserId(
    clerkUserId: string,
  ): Promise<CompleteAuthorProfile | null> {
    try {
      // Get Supabase profile data
      const supabaseProfile = await this.getProfileByClerkUserId(clerkUserId);

      // Get Clerk user data
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(clerkUserId);

      // Get author metadata from Clerk
      const authorMetadata = await getUserAuthorMetadata(clerkUserId);

      if (!supabaseProfile) {
        return null;
      }

      // Combine all data
      const completeProfile: CompleteAuthorProfile = {
        // Supabase fields (minimal - just linking)
        id: supabaseProfile.id,
        clerk_user_id: supabaseProfile.user_id,
        created_at: supabaseProfile.created_at,
        updated_at: supabaseProfile.updated_at,

        // Clerk basic profile data (primary source of truth)
        name:
          clerkUser.fullName ||
          `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        profile_image_url: clerkUser.imageUrl || null,

        // Clerk metadata (author-specific fields)
        bio: authorMetadata.bio ?? null,
        website_url: authorMetadata.website_url ?? null,
        twitter_username: authorMetadata.twitter_username ?? null,
        linkedin_url: authorMetadata.linkedin_url ?? null,
        facebook_url: authorMetadata.facebook_url ?? null,
        github_username: authorMetadata.github_username ?? null,
        goodreads_url: authorMetadata.goodreads_url ?? null,
        amazon_author_url: authorMetadata.amazon_author_url ?? null,
      };

      return completeProfile;
    } catch (error) {
      throw error;
    }
  }

  async createProfile(profileData: {
    clerk_user_id: string;
    initialMetadata?: Partial<AuthorMetadata>;
  }): Promise<CompleteAuthorProfile> {
    try {
      // Simple Clerk-first profile creation - just link Clerk user to Supabase
      const { data: newProfile, error } = await this.getSupabase()
        .from('authors')
        .insert({
          clerk_user_id: profileData.clerk_user_id,
          // Clerk handles all user approval/management
          // All author metadata stored in Clerk
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create Supabase profile: ${error.message}`);
      }

      // Initialize author metadata in Clerk
      try {
        await initializeUserAuthorMetadata(
          profileData.clerk_user_id,
          profileData.initialMetadata || {},
        );
      } catch {
        // Continue anyway, as we can retry metadata initialization later
        // Metadata initialization is not critical for profile creation
      }

      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      // Return complete profile with retry logic
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: Error | null = null;

      while (attempts < maxAttempts) {
        try {
          const completeProfile = await this.getCompleteProfileByClerkUserId(
            profileData.clerk_user_id,
          );

          if (completeProfile) {
            return completeProfile;
          }

          attempts++;

          if (attempts < maxAttempts) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 200 * attempts));
          }
        } catch (retrievalError) {
          lastError =
            retrievalError instanceof Error
              ? retrievalError
              : new Error('Unknown retrieval error');
          attempts++;

          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200 * attempts));
          }
        }
      }

      // If we get here, all retry attempts failed
      const errorMessage = `Failed to retrieve complete profile after creation. Profile ID: ${newProfile.id}, User: ${profileData.clerk_user_id}. Last error: ${lastError?.message || 'Unknown'}`;
      throw new Error(errorMessage);
    } catch (error) {
      throw error;
    }
  }

  async updateAuthorMetadata(
    clerkUserId: string,
    updates: Partial<AuthorMetadata>,
  ): Promise<AuthorMetadata> {
    try {
      // Update metadata in Clerk
      const updatedMetadata = await updateUserAuthorMetadata(
        clerkUserId,
        updates,
      );

      // Also update the Supabase record to reflect the modification time
      const { error } = await this.getSupabase()
        .from('authors')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', clerkUserId);

      if (error) {
        // Don't throw error for timestamp update failure, but log it
      }

      return updatedMetadata;
    } catch (error) {
      throw error;
    }
  }

  async getOrCreateProfile(
    clerkUserId: string,
    defaultMetadata?: Partial<AuthorMetadata>,
  ): Promise<CompleteAuthorProfile> {
    try {
      // Try to get existing complete profile
      const existingProfile =
        await this.getCompleteProfileByClerkUserId(clerkUserId);

      if (existingProfile) {
        return existingProfile;
      }

      // Create new profile if it doesn't exist
      return await this.createProfile({
        clerk_user_id: clerkUserId,
        initialMetadata: defaultMetadata,
      });
    } catch (error) {
      throw error;
    }
  }

  // Legacy method for backwards compatibility
  async updateProfile(
    id: string,
    updates: Partial<AuthorMetadata>,
  ): Promise<CompleteAuthorProfile> {
    try {
      // Get the author by ID to find clerk_user_id
      const { data: author, error } = await this.getSupabase()
        .from('authors')
        .select('clerk_user_id')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      // Update metadata in Clerk
      await this.updateAuthorMetadata(author.clerk_user_id, updates);

      // Return complete profile
      const completeProfile = await this.getCompleteProfileByClerkUserId(
        author.clerk_user_id,
      );

      if (!completeProfile) {
        throw new Error('Failed to retrieve complete profile after update');
      }

      return completeProfile;
    } catch (error) {
      throw error;
    }
  }

  // Utility method to get author metadata only
  async getAuthorMetadata(clerkUserId: string): Promise<AuthorMetadata> {
    try {
      return await getUserAuthorMetadata(clerkUserId);
    } catch (error) {
      throw error;
    }
  }

  // Clean up method to ensure profile exists in both systems
  async ensureProfileConsistency(
    clerkUserId: string,
  ): Promise<CompleteAuthorProfile> {
    try {
      // Check if Supabase profile exists
      const supabaseProfile = await this.getProfileByClerkUserId(clerkUserId);

      if (!supabaseProfile) {
        // Create Supabase profile if it doesn't exist
        return await this.createProfile({
          clerk_user_id: clerkUserId,
        });
      }

      // Ensure author metadata is initialized in Clerk
      try {
        await getUserAuthorMetadata(clerkUserId);
      } catch {
        // Initialize metadata if it doesn't exist
        await initializeUserAuthorMetadata(clerkUserId);
      }

      // Return complete profile
      const completeProfile =
        await this.getCompleteProfileByClerkUserId(clerkUserId);

      if (!completeProfile) {
        throw new Error('Failed to ensure profile consistency');
      }

      return completeProfile;
    } catch (error) {
      throw error;
    }
  }
}

export const authorProfileService = new AuthorProfileService();
