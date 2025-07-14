'use server';

import { revalidatePath } from 'next/cache';

import { Database } from '@/lib/database.types';
import { createServiceClient } from '@/lib/supabase/server';

type AuthorProfile = Database['public']['Tables']['authors']['Row'];
type AuthorProfileUpdate = Database['public']['Tables']['authors']['Update'];

export async function updateProfile(
  profileId: string,
  updates: AuthorProfileUpdate,
): Promise<AuthorProfile> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('authors')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  // Revalidate the profile page to show updated data
  revalidatePath('/dashboard/profile');

  return data;
}
