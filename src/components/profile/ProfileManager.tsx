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

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Profile update failed:', errorData);
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const responseData = await response.json();
      const { profile: updatedProfile } = responseData.data || responseData;

      if (!updatedProfile) {
        console.error('No profile in response:', responseData);
        throw new Error('Profile data missing from response');
      }

      // Update local state
      setProfile(updatedProfile);
      setIsEditing(false);

      // Call parent callback if provided
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Profile save error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update profile',
      );
    } finally {
      setIsLoading(false);
    }
  };

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
