'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Globe, Twitter, Linkedin, Facebook, Github, BookOpen } from 'lucide-react'

interface UserPlainData {
  firstName: string
  lastName: string
  imageUrl: string
  email: string
}

interface AuthorPlainData {
  id: string
  clerk_user_id: string
  name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  bio: string | null
  website: string | null
  twitter_username: string | null
  linkedin_url: string | null
  facebook_url: string | null
  github_username: string | null
  goodreads_url: string | null
  created_at: string
  updated_at: string
}

interface ProfileViewProps {
  userPlainData: UserPlainData | null
  authorProfile: AuthorPlainData | null
}

export function ProfileView({ userPlainData, authorProfile }: ProfileViewProps) {
  if (!userPlainData || !authorProfile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Unable to load profile data</p>
      </div>
    )
  }

  const displayName = authorProfile.name || `${userPlainData.firstName} ${userPlainData.lastName}`.trim() || 'Unknown User'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase()

  const socialLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      url: authorProfile.twitter_username ? `https://twitter.com/${authorProfile.twitter_username}` : null,
      value: authorProfile.twitter_username
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      url: authorProfile.linkedin_url,
      value: authorProfile.linkedin_url
    },
    {
      name: 'Facebook',
      icon: Facebook,
      url: authorProfile.facebook_url,
      value: authorProfile.facebook_url
    },
    {
      name: 'GitHub',
      icon: Github,
      url: authorProfile.github_username ? `https://github.com/${authorProfile.github_username}` : null,
      value: authorProfile.github_username
    },
    {
      name: 'Goodreads',
      icon: BookOpen,
      url: authorProfile.goodreads_url,
      value: authorProfile.goodreads_url
    }
  ]

  const activeSocialLinks = socialLinks.filter(link => link.value)

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile</h2>
        <p className="text-gray-600">Manage your author profile and social connections</p>
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
              <p className="text-gray-600">{authorProfile.email || userPlainData.email}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Basic Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">First Name:</span>
                  <span className="text-sm">{authorProfile.first_name || userPlainData.firstName || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Last Name:</span>
                  <span className="text-sm">{authorProfile.last_name || userPlainData.lastName || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{authorProfile.email || userPlainData.email}</span>
                </div>
                {authorProfile.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <a 
                      href={authorProfile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {authorProfile.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Bio Section */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Bio</h4>
              <p className="text-sm text-gray-600">
                {authorProfile.bio || 'No bio added yet'}
              </p>
            </div>
          </div>

          {/* Social Media Links */}
          {activeSocialLinks.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Social Media Connections</h4>
              <div className="flex flex-wrap gap-2">
                {activeSocialLinks.map((link) => (
                  <Badge key={link.name} variant="outline" className="flex items-center gap-2">
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
            <Button variant="outline" className="w-full md:w-auto">
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 