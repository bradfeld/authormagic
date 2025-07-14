'use client';

import {
  Mail,
  Globe,
  Twitter,
  Linkedin,
  Facebook,
  Github,
  BookOpen,
  Edit,
} from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from '@/lib/database.types';

import { ProfileEditDialog } from './ProfileEditDialog';

type AuthorProfileDB = Database['public']['Tables']['authors']['Row'];

interface UserPlainData {
  firstName: string;
  lastName: string;
  imageUrl: string;
  email: string;
}

interface AuthorPlainData {
  id: string;
  clerk_user_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  bio: string | null;
  website_url: string | null;
  twitter_username: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  github_username: string | null;
  goodreads_url: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileViewProps {
  userPlainData: UserPlainData | null;
  authorProfile: AuthorPlainData | null;
}

export function ProfileView({
  userPlainData,
  authorProfile,
}: ProfileViewProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<AuthorPlainData | null>(
    authorProfile,
  );

  if (!userPlainData || !currentProfile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Unable to load profile data</p>
      </div>
    );
  }

  const handleEditProfile = () => {
    setIsEditDialogOpen(true);
  };

  const handleProfileUpdate = (updatedProfile: AuthorProfileDB) => {
    // Convert the DB profile to the plain data format
    const plainProfile: AuthorPlainData = {
      id: updatedProfile.id,
      clerk_user_id: updatedProfile.clerk_user_id,
      name: updatedProfile.name,
      first_name: updatedProfile.first_name,
      last_name: updatedProfile.last_name,
      email: updatedProfile.email,
      bio: updatedProfile.bio,
      website_url: updatedProfile.website_url,
      twitter_username: updatedProfile.twitter_username,
      linkedin_url: updatedProfile.linkedin_url,
      facebook_url: updatedProfile.facebook_url,
      github_username: updatedProfile.github_username,
      goodreads_url: updatedProfile.goodreads_url,
      created_at: updatedProfile.created_at,
      updated_at: updatedProfile.updated_at,
    };
    setCurrentProfile(plainProfile);
  };

  const displayName =
    currentProfile.name ||
    `${userPlainData.firstName} ${userPlainData.lastName}`.trim() ||
    'Unknown User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const socialLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      url: currentProfile.twitter_username
        ? `https://twitter.com/${currentProfile.twitter_username}`
        : null,
      value: currentProfile.twitter_username,
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: currentProfile.linkedin_url,
      value: currentProfile.linkedin_url,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: currentProfile.facebook_url,
      value: currentProfile.facebook_url,
    },
    {
      name: 'GitHub',
      icon: Github,
      url: currentProfile.github_username
        ? `https://github.com/${currentProfile.github_username}`
        : null,
      value: currentProfile.github_username,
    },
    {
      name: 'Goodreads',
      icon: BookOpen,
      url: currentProfile.goodreads_url,
      value: currentProfile.goodreads_url,
    },
  ];

  const activeSocialLinks = socialLinks.filter(link => link.value);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile</h2>
        <p className="text-gray-600">
          Manage your author profile and social connections
        </p>
      </div>

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="w-16 h-16">
              <AvatarImage src={userPlainData.imageUrl} alt={displayName} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{displayName}</h3>
              <p className="text-gray-600">
                {currentProfile.email || userPlainData.email}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Basic Information
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">First Name:</span>
                  <span className="text-sm">
                    {currentProfile.first_name ||
                      userPlainData.firstName ||
                      'Not set'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Last Name:</span>
                  <span className="text-sm">
                    {currentProfile.last_name ||
                      userPlainData.lastName ||
                      'Not set'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">
                    {currentProfile.email || userPlainData.email}
                  </span>
                </div>
                {currentProfile.website_url && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a
                      href={currentProfile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {currentProfile.website_url}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Bio Section */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Bio</h4>
              <p className="text-sm text-gray-600">
                {currentProfile.bio || 'No bio added yet'}
              </p>
            </div>
          </div>

          {/* Social Media Links */}
          {activeSocialLinks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3">
                Social Media Connections
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeSocialLinks.map(link => (
                  <Badge
                    key={link.name}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <link.icon className="w-3 h-3" />
                    <span className="text-xs">{link.name}</span>
                    {link.url && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 ml-1"
                      >
                        View
                      </a>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Edit Profile Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full md:w-auto"
              onClick={handleEditProfile}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <ProfileEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        profile={currentProfile as AuthorProfileDB}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
}
