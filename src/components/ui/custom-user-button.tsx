'use client';

import { UserButton } from '@clerk/nextjs';

export function CustomUserButton() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: 'h-10 w-10',
        },
      }}
    />
  );
}
