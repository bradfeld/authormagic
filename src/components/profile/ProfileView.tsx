'use client'

import { User } from '@clerk/nextjs/server'
import { Author } from '@/lib/services/author-profile.service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Globe, Twitter, Linkedin, Facebook, Github, BookOpen } from 'lucide-react'

interface ProfileViewProps {
  user: User | null
  authorProfile: Author | null
}

export function ProfileView({ user, authorProfile }: ProfileViewProps) {
  if (!user || !authorProfile) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Unable to load profile information</p>
        </CardContent>
      </Card>
    )
  }

  // Get initials for avatar fallback
  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()

  // Social media links
  const socialLinks = [
    {
      platform: 'Twitter',
      icon: Twitter,
      value: authorProfile.twitter_username,
      url: authorProfile.twitter_username ? `https://twitter.com/${authorProfile.twitter_username}` : null,
      color: 'text-blue-400'
    },
    {
      platform: 'LinkedIn',
      icon: Linkedin,
      value: authorProfile.linkedin_url,
      url: authorProfile.linkedin_url,
      color: 'text-blue-600'
    },
    {
      platform: 'Facebook',
      icon: Facebook,
      value: authorProfile.facebook_url,
      url: authorProfile.facebook_url,
      color: 'text-blue-800'
    },
    {
      platform: 'GitHub',
      icon: Github,
      value: authorProfile.github_username,
      url: authorProfile.github_username ? `https://github.com/${authorProfile.github_username}` : null,
      color: 'text-gray-800'
    },
    {
      platform: 'Goodreads',
      icon: BookOpen,
      value: authorProfile.goodreads_url,
      url: authorProfile.goodreads_url,
      color: 'text-amber-600'
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Author Profile</CardTitle>
            <Button variant="outline" disabled>
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center md:items-start space-y-4">
              <Avatar className="w-32 h-32">
                <AvatarImage src={user.imageUrl} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <h3 className="text-xl font-semibold text-gray-900">
                  {authorProfile.first_name || user.firstName} {authorProfile.last_name || user.lastName}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 justify-center md:justify-start">
                  <Mail className="w-4 h-4" />
                  {authorProfile.email}
                </p>
              </div>
            </div>

            {/* Profile Details */}
            <div className="flex-1 space-y-4">
              {/* Bio */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Bio</h4>
                <p className="text-gray-600 text-sm">
                  {authorProfile.bio || 'No bio provided yet.'}
                </p>
              </div>

              {/* Website */}
              {authorProfile.website_url && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Website</h4>
                  <a 
                    href={authorProfile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1"
                  >
                    <Globe className="w-4 h-4" />
                    {authorProfile.website_url}
                  </a>
                </div>
              )}

              {/* Account Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Account Information</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Member since: {new Date(authorProfile.created_at).toLocaleDateString()}</p>
                  <p>Last updated: {new Date(authorProfile.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Social Media Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon
              return (
                <div key={social.platform} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${social.color}`} />
                    <span className="font-medium">{social.platform}</span>
                  </div>
                  <div>
                    {social.value ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Connected
                        </Badge>
                        {social.url && (
                          <a
                            href={social.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 text-xs"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Not connected
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 