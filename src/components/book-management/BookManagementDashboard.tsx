'use client';

import React from 'react';

import { BookLibrary } from './BookLibrary';

interface UserInfo {
  firstName: string | null;
  lastName: string | null;
  userId: string;
}

interface BookManagementDashboardProps {
  userInfo: UserInfo;
}

export function BookManagementDashboard({
  userInfo,
}: BookManagementDashboardProps) {
  const displayName =
    `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'Author';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Book Management Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome, {displayName}! Manage your book collection here.
        </p>
      </div>

      <BookLibrary books={[]} />
    </div>
  );
}
