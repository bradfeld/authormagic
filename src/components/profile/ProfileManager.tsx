'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { CompleteAuthorProfile } from '@/lib/services/author-profile.service';
import { AuthorMetadata } from '@/lib/utils/clerk-metadata';

import { ProfileDisplay } from './ProfileDisplay';
import { ProfileEditForm } from './ProfileEditForm';

interface ProfileManagerProps {
  initialProfile: CompleteAuthorProfile | null | undefined;
  isOwnProfile?: boolean;
  onProfileUpdate?: (profile: CompleteAuthorProfile) => void;
}

export function ProfileManager({
  initialProfile,
  isOwnProfile = false,
  onProfileUpdate,
}: ProfileManagerProps) {
  const [profile, setProfile] = useState<
    CompleteAuthorProfile | null | undefined
  >(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEditStart = () => {
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async (updates: Partial<AuthorMetadata>) => {
    setIsLoading(true);

    console.log('🔄 Starting profile save...');
    console.log('📋 Updates being sent:', JSON.stringify(updates, null, 2));

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      console.log('📡 API Response status:', response.status, response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const responseData = await response.json();
      console.log('✅ API Response data:', responseData);

      // Fix: Extract profile from data object (API returns {data: {profile: ...}})
      const { profile: updatedProfile } = responseData.data || responseData;

      if (!updatedProfile) {
        console.error('❌ No profile in response:', responseData);
        throw new Error('Profile data missing from response');
      }

      console.log('📝 Updating profile state...');
      console.log('🔍 Updated profile bio:', updatedProfile.bio);
      console.log(
        '🔍 Updated profile website_url:',
        updatedProfile.website_url,
      );
      console.log(
        '🔍 Updated profile twitter_username:',
        updatedProfile.twitter_username,
      );
      console.log('🔍 Updated profile updated_at:', updatedProfile.updated_at);

      // Update local state
      setProfile(updatedProfile);
      setIsEditing(false);

      // Call parent callback if provided
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      toast.success('Profile updated successfully!');
      console.log('✅ Profile save completed successfully');
    } catch (error) {
      console.error('❌ Profile save error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update profile',
      );

      // Don't exit editing mode on error
      // setIsEditing(false); // Remove this so user can retry
    } finally {
      setIsLoading(false);
      console.log('🏁 Profile save process finished');
    }
  };

  console.log('🎯 ProfileManager render:', {
    profile: profile ? 'has profile' : 'no profile',
    isEditing,
    isLoading,
  });

  return (
    <div className="w-full flex justify-center">
      {isEditing ? (
        <ProfileEditForm
          profile={profile}
          onSave={handleSave}
          onCancel={handleEditCancel}
          isLoading={isLoading}
        />
      ) : (
        <ProfileDisplay
          profile={profile}
          onEdit={handleEditStart}
          isOwnProfile={isOwnProfile}
        />
      )}
    </div>
  );
}
