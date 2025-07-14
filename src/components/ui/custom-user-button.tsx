'use client'

import { UserButton } from '@clerk/nextjs'
import { User } from 'lucide-react'

export function CustomUserButton() {
  return (
    <UserButton 
      appearance={{
        elements: {
          avatarBox: "h-10 w-10"
        }
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Link 
          label="View Profile"
          labelIcon={<User className="h-4 w-4" />}
          href="/dashboard/profile"
        />
      </UserButton.MenuItems>
    </UserButton>
  )
} 