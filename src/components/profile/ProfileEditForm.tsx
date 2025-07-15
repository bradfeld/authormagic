'use client';

import {
  Save,
  X,
  User,
  Globe,
  Twitter,
  Linkedin,
  Github,
  Book,
  ShoppingCart,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CompleteAuthorProfile } from '@/lib/services/author-profile.service';
import { AuthorMetadata } from '@/lib/utils/clerk-metadata';
import { validateAmazonAuthorUrl } from '@/lib/utils/validation';

interface ProfileEditFormProps {
  profile: CompleteAuthorProfile;
  onSave: (updates: Partial<AuthorMetadata>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProfileEditForm({
  profile,
  onSave,
  onCancel,
  isLoading = false,
}: ProfileEditFormProps) {
  const [formData, setFormData] = useState<AuthorMetadata>({
    bio: profile.bio || '',
    website_url: profile.website_url || '',
    twitter_username: profile.twitter_username || '',
    linkedin_url: profile.linkedin_url || '',
    facebook_url: profile.facebook_url || '',
    github_username: profile.github_username || '',
    goodreads_url: profile.goodreads_url || '',
    amazon_author_url: profile.amazon_author_url || '',
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof AuthorMetadata, string>>
  >({});

  const validateField = (
    field: keyof AuthorMetadata,
    value: string,
  ): string | null => {
    if (!value) return null;

    switch (field) {
      case 'website_url':
      case 'linkedin_url':
      case 'facebook_url':
      case 'goodreads_url':
        try {
          new URL(value);
          return null;
        } catch {
          return 'Please enter a valid URL (including https://)';
        }

      case 'amazon_author_url':
        if (!validateAmazonAuthorUrl(value)) {
          return 'Please enter a valid Amazon Author profile URL (e.g., https://www.amazon.com/author/yourname)';
        }
        return null;

      case 'twitter_username':
        if (!/^[A-Za-z0-9_]{1,15}$/.test(value)) {
          return 'Twitter username must be 1-15 characters, letters, numbers, and underscores only';
        }
        return null;

      case 'github_username':
        if (!/^[A-Za-z0-9]([A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(value)) {
          return 'GitHub username must be valid GitHub username format';
        }
        return null;

      case 'bio':
        if (value.length > 1000) {
          return 'Bio must be less than 1000 characters';
        }
        return null;

      default:
        return null;
    }
  };

  const handleFieldChange = (field: keyof AuthorMetadata, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Partial<Record<keyof AuthorMetadata, string>> = {};

    (Object.keys(formData) as (keyof AuthorMetadata)[]).forEach(field => {
      const value = formData[field];
      if (value) {
        const error = validateField(field, value);
        if (error) {
          newErrors[field] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Prepare updates (only send non-empty values)
    const updates: Partial<AuthorMetadata> = {};
    (Object.keys(formData) as (keyof AuthorMetadata)[]).forEach(field => {
      const value = formData[field];
      updates[field] = value || null;
    });

    try {
      await onSave(updates);
    } catch {
      // Error handling is done in the parent component
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Edit Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bio Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              <User className="inline h-4 w-4 mr-2" />
              Bio
            </label>
            <Textarea
              value={formData.bio || ''}
              onChange={e => handleFieldChange('bio', e.target.value)}
              placeholder="Tell readers about yourself..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            {errors.bio && <p className="text-sm text-red-600">{errors.bio}</p>}
            <p className="text-xs text-gray-500">
              {(formData.bio || '').length}/1000 characters
            </p>
          </div>

          {/* Website Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              <Globe className="inline h-4 w-4 mr-2" />
              Website
            </label>
            <Input
              type="url"
              value={formData.website_url || ''}
              onChange={e => handleFieldChange('website_url', e.target.value)}
              placeholder="https://your-website.com"
              disabled={isLoading}
            />
            {errors.website_url && (
              <p className="text-sm text-red-600">{errors.website_url}</p>
            )}
          </div>

          {/* Social Media Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Social Media</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Twitter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <Twitter className="inline h-4 w-4 mr-2" />X Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    @
                  </span>
                  <Input
                    value={formData.twitter_username || ''}
                    onChange={e =>
                      handleFieldChange('twitter_username', e.target.value)
                    }
                    placeholder="username"
                    className="pl-8"
                    disabled={isLoading}
                  />
                </div>
                {errors.twitter_username && (
                  <p className="text-sm text-red-600">
                    {errors.twitter_username}
                  </p>
                )}
              </div>

              {/* GitHub */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <Github className="inline h-4 w-4 mr-2" />
                  GitHub Username
                </label>
                <Input
                  value={formData.github_username || ''}
                  onChange={e =>
                    handleFieldChange('github_username', e.target.value)
                  }
                  placeholder="username"
                  disabled={isLoading}
                />
                {errors.github_username && (
                  <p className="text-sm text-red-600">
                    {errors.github_username}
                  </p>
                )}
              </div>

              {/* LinkedIn */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <Linkedin className="inline h-4 w-4 mr-2" />
                  LinkedIn URL
                </label>
                <Input
                  type="url"
                  value={formData.linkedin_url || ''}
                  onChange={e =>
                    handleFieldChange('linkedin_url', e.target.value)
                  }
                  placeholder="https://linkedin.com/in/yourname"
                  disabled={isLoading}
                />
                {errors.linkedin_url && (
                  <p className="text-sm text-red-600">{errors.linkedin_url}</p>
                )}
              </div>

              {/* Facebook */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Facebook URL
                </label>
                <Input
                  type="url"
                  value={formData.facebook_url || ''}
                  onChange={e =>
                    handleFieldChange('facebook_url', e.target.value)
                  }
                  placeholder="https://facebook.com/yourname"
                  disabled={isLoading}
                />
                {errors.facebook_url && (
                  <p className="text-sm text-red-600">{errors.facebook_url}</p>
                )}
              </div>

              {/* Goodreads */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <Book className="inline h-4 w-4 mr-2" />
                  Goodreads URL
                </label>
                <Input
                  type="url"
                  value={formData.goodreads_url || ''}
                  onChange={e =>
                    handleFieldChange('goodreads_url', e.target.value)
                  }
                  placeholder="https://goodreads.com/author/show/yourname"
                  disabled={isLoading}
                />
                {errors.goodreads_url && (
                  <p className="text-sm text-red-600">{errors.goodreads_url}</p>
                )}
              </div>

              {/* Amazon */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  <ShoppingCart className="inline h-4 w-4 mr-2" />
                  Amazon
                </label>
                <Input
                  type="url"
                  value={formData.amazon_author_url || ''}
                  onChange={e =>
                    handleFieldChange('amazon_author_url', e.target.value)
                  }
                  placeholder="https://www.amazon.com/author/yourname"
                  disabled={isLoading}
                />
                {errors.amazon_author_url && (
                  <p className="text-sm text-red-600">
                    {errors.amazon_author_url}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
