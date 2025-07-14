'use client';

import React from 'react';

import { Author } from '@/lib/services/author-profile.service';

import { BookLibrary } from './BookLibrary';

interface BookManagementDashboardProps {
  authorProfile: Author;
}

export function BookManagementDashboard({
  authorProfile,
}: BookManagementDashboardProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Book Management Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome, {authorProfile.name}! Manage your book collection here.
        </p>
      </div>

      <BookLibrary books={[]} />
    </div>
  );
}
