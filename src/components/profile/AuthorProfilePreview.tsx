'use client';

import {
  ExternalLink,
  Edit,
  Globe,
  Twitter,
  Linkedin,
  Facebook,
  Github,
  BookOpen,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CompleteAuthorProfile } from '@/lib/services/author-profile.service';

interface AuthorProfilePreviewProps {
  profile: CompleteAuthorProfile;
}

export function AuthorProfilePreview({ profile }: AuthorProfilePreviewProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Author Profile
          </CardTitle>
          <Link href="/profile">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bio Preview */}
        {profile.bio ? (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">About</h4>
            <p className="text-gray-700 text-sm leading-relaxed">
              {profile.bio.length > 150
                ? `${profile.bio.substring(0, 150)}...`
                : profile.bio}
            </p>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No bio added yet</p>
          </div>
        )}

        {/* Social Links */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Connect</h4>
          <div className="grid grid-cols-2 gap-2">
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span>Website</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            )}

            {profile.twitter_username && (
              <a
                href={`https://x.com/${profile.twitter_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Twitter className="h-4 w-4" />
                <span>X</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            )}

            {profile.linkedin_url && (
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Linkedin className="h-4 w-4" />
                <span>LinkedIn</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            )}

            {profile.facebook_url && (
              <a
                href={profile.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Facebook className="h-4 w-4" />
                <span>Facebook</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            )}

            {profile.github_username && (
              <a
                href={`https://github.com/${profile.github_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            )}

            {profile.goodreads_url && (
              <a
                href={profile.goodreads_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                <span>Goodreads</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            )}

            {profile.amazon_author_url && (
              <a
                href={profile.amazon_author_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Amazon</span>
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            )}
          </div>

          {/* Empty State for Social Links */}
          {!profile.website_url &&
            !profile.twitter_username &&
            !profile.linkedin_url &&
            !profile.facebook_url &&
            !profile.github_username &&
            !profile.goodreads_url &&
            !profile.amazon_author_url && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No social links added yet</p>
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
