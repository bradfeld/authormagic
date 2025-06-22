import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { supabaseId, userData } = await request.json()

    if (!supabaseId || !userData?.email) {
      return NextResponse.json(
        { error: 'Missing required fields: supabaseId and userData.email' },
        { status: 400 }
      )
    }

    // Create user profile using Prisma Client (handles all defaults automatically)
    const data = await prisma.user.create({
      data: {
        supabaseId,
        email: userData.email,
        name: userData.name || null,
        username: userData.username || null,
        bio: userData.bio || null
        // Prisma automatically handles:
        // - id: @default(cuid())
        // - newsletterOptIn: @default(true)
        // - emailNotifications: @default(true) 
        // - profilePublic: @default(true)
        // - createdAt: @default(now())
        // - updatedAt: @updatedAt
      }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 