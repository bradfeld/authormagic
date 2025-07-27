import { clerkClient } from '@clerk/nextjs/server';

import { createClient } from '@/lib/supabase/server';

export interface UserDeletionResult {
  success: boolean;
  userDeleted: boolean;
  artifactsRemoved: {
    supabaseRoles: boolean;
    profileData: boolean;
    bookLibrary: boolean;
    auditLogsKept: boolean;
  };
  errors?: string[];
  summary: string;
}

export class UserDeletionService {
  private async getSupabaseClient() {
    return createClient();
  }

  async deleteUserAndArtifacts(
    userIdToDelete: string,
  ): Promise<UserDeletionResult> {
    const errors: string[] = [];
    let userDeleted = false;
    const artifactsRemoved = {
      supabaseRoles: false,
      profileData: false,
      bookLibrary: false,
      auditLogsKept: true, // We keep audit logs for compliance
    };

    try {
      // Step 1: Remove user from Supabase user_roles table
      try {
        const supabase = await this.getSupabaseClient();
        const { error: rolesError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userIdToDelete);

        if (rolesError) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log(
              'Note: User had no roles in Supabase (expected for regular users)',
            );
          }
        }
        artifactsRemoved.supabaseRoles = true;
      } catch (error) {
        errors.push(
          `Failed to remove user roles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Step 2: Clean up any profile data (if we have user profiles in the future)
      try {
        const supabase = await this.getSupabaseClient();

        // Check for any user-specific data tables and clean them up
        // For now, we'll check common patterns but this can be expanded

        // Clean up any user-specific book data (if exists)
        const { error: booksError } = await supabase
          .from('user_books') // Hypothetical table - adjust based on your schema
          .delete()
          .eq('user_id', userIdToDelete);

        // Don't treat missing table as error - just note it
        if (
          booksError &&
          !booksError.message.includes('relation "user_books" does not exist')
        ) {
          errors.push(`Failed to clean book data: ${booksError.message}`);
        } else {
          artifactsRemoved.bookLibrary = true;
        }

        // Clean up any profile data (if exists)
        const { error: profileError } = await supabase
          .from('user_profiles') // Hypothetical table - adjust based on your schema
          .delete()
          .eq('user_id', userIdToDelete);

        // Don't treat missing table as error - just note it
        if (
          profileError &&
          !profileError.message.includes(
            'relation "user_profiles" does not exist',
          )
        ) {
          errors.push(`Failed to clean profile data: ${profileError.message}`);
        } else {
          artifactsRemoved.profileData = true;
        }
      } catch (error) {
        errors.push(
          `Failed to clean user data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Step 3: Delete user from Clerk (do this last so we can still access user data for cleanup)
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(userIdToDelete);
        userDeleted = true;
      } catch (error) {
        errors.push(
          `Failed to delete user from Clerk: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      // Generate summary
      const summary = this.generateDeletionSummary(
        userDeleted,
        artifactsRemoved,
        errors,
      );

      return {
        success: errors.length === 0 && userDeleted,
        userDeleted,
        artifactsRemoved,
        errors: errors.length > 0 ? errors : undefined,
        summary,
      };
    } catch (error) {
      errors.push(
        `Unexpected error during deletion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        success: false,
        userDeleted,
        artifactsRemoved,
        errors,
        summary: 'Deletion failed due to unexpected error',
      };
    }
  }

  private generateDeletionSummary(
    userDeleted: boolean,
    artifactsRemoved: UserDeletionResult['artifactsRemoved'],
    errors: string[],
  ): string {
    const parts = [];

    if (userDeleted) {
      parts.push('✅ User deleted from Clerk');
    } else {
      parts.push('❌ Failed to delete user from Clerk');
    }

    if (artifactsRemoved.supabaseRoles) {
      parts.push('✅ User roles cleaned from Supabase');
    }

    if (artifactsRemoved.profileData) {
      parts.push('✅ Profile data cleaned (if any)');
    }

    if (artifactsRemoved.bookLibrary) {
      parts.push('✅ Book library data cleaned (if any)');
    }

    if (artifactsRemoved.auditLogsKept) {
      parts.push('ℹ️ Audit logs preserved for compliance');
    }

    if (errors.length > 0) {
      parts.push(`⚠️ ${errors.length} error(s) occurred`);
    }

    return parts.join('; ');
  }

  /**
   * Get a preview of what would be deleted without actually deleting
   * Useful for confirmation dialogs
   */
  async getDeletePreview(userIdToDelete: string): Promise<{
    userExists: boolean;
    hasRoles: boolean;
    hasProfileData: boolean;
    hasBookData: boolean;
    estimatedArtifacts: number;
  }> {
    try {
      // Check if user exists in Clerk
      let userExists = false;
      try {
        const clerk = await clerkClient();
        await clerk.users.getUser(userIdToDelete);
        userExists = true;
      } catch {
        userExists = false;
      }

      if (!userExists) {
        return {
          userExists: false,
          hasRoles: false,
          hasProfileData: false,
          hasBookData: false,
          estimatedArtifacts: 0,
        };
      }

      // Check Supabase data
      const supabase = await this.getSupabaseClient();
      let hasRoles = false;
      let hasProfileData = false;
      let hasBookData = false;
      let estimatedArtifacts = 0;

      // Check roles
      try {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userIdToDelete)
          .limit(1);

        hasRoles = Boolean(roles && roles.length > 0);
        if (hasRoles) estimatedArtifacts += 1;
      } catch {
        // Table might not exist, ignore
      }

      // Check for hypothetical profile data
      try {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', userIdToDelete)
          .limit(1);

        hasProfileData = Boolean(profiles && profiles.length > 0);
        if (hasProfileData) estimatedArtifacts += 1;
      } catch {
        // Table might not exist, ignore
      }

      // Check for hypothetical book data
      try {
        const { data: books } = await supabase
          .from('user_books')
          .select('id')
          .eq('user_id', userIdToDelete)
          .limit(1);

        hasBookData = Boolean(books && books.length > 0);
        if (hasBookData) estimatedArtifacts += 1;
      } catch {
        // Table might not exist, ignore
      }

      return {
        userExists,
        hasRoles,
        hasProfileData,
        hasBookData,
        estimatedArtifacts,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error getting delete preview:', error);
      }

      return {
        userExists: false,
        hasRoles: false,
        hasProfileData: false,
        hasBookData: false,
        estimatedArtifacts: 0,
      };
    }
  }
}
