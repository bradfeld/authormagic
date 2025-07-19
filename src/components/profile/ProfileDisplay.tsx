'use client';

import {
  Book,
  Calendar,
  Edit,
  Facebook,
  Github,
  Globe,
  Linkedin,
  ShoppingCart,
  Twitter,
} from 'lucide-react';
import Image from 'next/image';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompleteAuthorProfile } from '@/lib/services/author-profile.service';

interface ProfileDisplayProps {
  profile: CompleteAuthorProfile;
  onEdit: () => void;
  isOwnProfile?: boolean;
}

export function ProfileDisplay({
  profile,
  onEdit,
  isOwnProfile = false,
}: ProfileDisplayProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSocialLinks = () => {
    const links = [];

    if (profile.website_url) {
      links.push({
        icon: Globe,
        label: 'Website',
        url: profile.website_url,
        handle: new URL(profile.website_url).hostname,
      });
    }

    if (profile.twitter_username) {
      links.push({
        icon: Twitter,
        label: 'X',
        url: `https://x.com/${profile.twitter_username}`,
        handle: `@${profile.twitter_username}`,
      });
    }

    if (profile.linkedin_url) {
      links.push({
        icon: Linkedin,
        label: 'LinkedIn',
        url: profile.linkedin_url,
        handle: 'LinkedIn Profile',
      });
    }

    if (profile.github_username) {
      links.push({
        icon: Github,
        label: 'GitHub',
        url: `https://github.com/${profile.github_username}`,
        handle: profile.github_username,
      });
    }

    if (profile.facebook_url) {
      links.push({
        icon: Facebook,
        label: 'Facebook',
        url: profile.facebook_url,
        handle: 'Facebook Profile',
      });
    }

    if (profile.goodreads_url) {
      links.push({
        icon: Book,
        label: 'Goodreads',
        url: profile.goodreads_url,
        handle: 'Goodreads Profile',
      });
    }

    if (profile.amazon_author_url) {
      links.push({
        icon: ShoppingCart,
        label: 'Amazon',
        url: profile.amazon_author_url,
        handle: 'Amazon Profile',
      });
    }

    return links;
  };

  const socialLinks = getSocialLinks();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">Profile</CardTitle>
          {isOwnProfile && (
            <Button onClick={onEdit} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20">
            {profile.profile_image_url ? (
              <Image
                src={profile.profile_image_url}
                alt={profile.name}
                width={80}
                height={80}
                className="h-full w-full object-cover rounded-full"
                onError={e => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="h-full w-full bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl font-semibold text-gray-600">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </Avatar>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
            <p className="text-gray-600">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Member since {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {profile.bio && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">About</h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          </div>
        )}

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Connect</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <link.icon className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {link.label}
                    </p>
                    <p className="text-xs text-gray-500">{link.handle}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!profile.bio && socialLinks.length === 0 && isOwnProfile && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">Your profile is looking a bit empty!</p>
            <p className="text-sm mt-2">
              Add a bio and social links to help readers connect with you.
            </p>
            <Button onClick={onEdit} className="mt-4">
              <Edit className="h-4 w-4 mr-2" />
              Complete Your Profile
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
