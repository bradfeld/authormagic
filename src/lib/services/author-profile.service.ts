import { Database } from '@/lib/database.types';
import { createServiceClient } from '@/lib/supabase/server';

export type Author = Database['public']['Tables']['authors']['Row'];
type AuthorProfile = Database['public']['Tables']['authors']['Row'];
type NewAuthorProfile = Database['public']['Tables']['authors']['Insert'];

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
        console.error('Error fetching author profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getProfileByClerkUserId:', error);
      throw error;
    }
  }

  async createProfile(profileData: NewAuthorProfile): Promise<AuthorProfile> {
    try {
      const { data, error } = await this.getSupabase()
        .from('authors')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating author profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createProfile:', error);
      throw error;
    }
  }

  async updateProfile(
    id: string,
    updates: Partial<NewAuthorProfile>,
  ): Promise<AuthorProfile> {
    try {
      const { data, error } = await this.getSupabase()
        .from('authors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating author profile:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }

  async getOrCreateProfile(
    clerkUserId: string,
    defaultData: Omit<NewAuthorProfile, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<AuthorProfile> {
    try {
      // Try to get existing profile
      const existingProfile = await this.getProfileByClerkUserId(clerkUserId);

      if (existingProfile) {
        return existingProfile;
      }

      // Create new profile if it doesn't exist
      return await this.createProfile({
        ...defaultData,
        clerk_user_id: clerkUserId,
      });
    } catch (error) {
      console.error('Error in getOrCreateProfile:', error);
      throw error;
    }
  }
}

export const authorProfileService = new AuthorProfileService();
