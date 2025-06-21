import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// URL validation regex (optional field)
const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

interface WaitlistData {
  name: string;
  email: string;
  website?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WaitlistData = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate name length
    if (body.name.trim().length < 1 || body.name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!emailRegex.test(body.email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate website URL if provided
    if (body.website && body.website.trim() !== '') {
      if (!urlRegex.test(body.website.trim())) {
        return NextResponse.json(
          { error: 'Please enter a valid website URL (including http:// or https://)' },
          { status: 400 }
        );
      }
    }

    // Normalize data
    const normalizedData = {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      website: body.website?.trim() || null,
    };

    // Check for duplicate email
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email: normalizedData.email },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: 'This email is already on the waitlist' },
        { status: 409 }
      );
    }

    // Create new waitlist entry
    const waitlistEntry = await prisma.waitlist.create({
      data: normalizedData,
    });

    return NextResponse.json(
      { 
        message: 'Successfully added to waitlist!',
        id: waitlistEntry.id 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Waitlist API error:', error);
    
    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'This email is already on the waitlist' },
          { status: 409 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
} 