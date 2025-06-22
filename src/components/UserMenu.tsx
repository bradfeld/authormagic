'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from './AuthModal'

export const UserMenu: React.FC = () => {
  const { user, userProfile, signOut, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
  }

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode)
    setAuthModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    )
  }

  if (user) {
    // User is signed in
    return (
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {(userProfile?.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:block">
            {userProfile?.name || user.email}
          </span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
            <div className="px-4 py-2 text-sm text-gray-700 border-b">
              <div className="font-medium">{userProfile?.name || 'User'}</div>
              <div className="text-gray-500">{user.email}</div>
            </div>
            <button
              onClick={() => setUserMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Profile
            </button>
            <button
              onClick={() => setUserMenuOpen(false)}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Click outside to close */}
        {userMenuOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setUserMenuOpen(false)}
          ></div>
        )}
      </div>
    )
  }

  // User is not signed in
  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => openAuthModal('login')}
          className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
        >
          Log In
        </button>
        <button
          onClick={() => openAuthModal('register')}
          className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
        >
          Sign Up
        </button>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </>
  )
} 