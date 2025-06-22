import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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

    // Check for duplicate email using Supabase
    const { data: existingEntry, error: checkError } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', normalizedData.email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking for duplicate email:', checkError);
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    if (existingEntry) {
      return NextResponse.json(
        { error: 'This email is already on the waitlist' },
        { status: 409 }
      );
    }

    // Create new waitlist entry using Supabase with existing database schema (camelCase)
    const now = new Date().toISOString()
    const waitlistRecord = {
      id: crypto.randomUUID(), // Manual ID generation
      name: normalizedData.name,
      email: normalizedData.email,
      website: normalizedData.website,
      createdAt: now, // Using existing camelCase column name
      updatedAt: now // Using existing camelCase column name
    }

    const { data: waitlistEntry, error: insertError } = await supabase
      .from('waitlist')
      .insert(waitlistRecord)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating waitlist entry:', insertError);
      
      // Handle unique constraint violations
      if (insertError.code === '23505') { // PostgreSQL unique constraint violation
        return NextResponse.json(
          { error: 'This email is already on the waitlist' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Successfully added to waitlist!',
        id: waitlistEntry.id 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Waitlist API error:', error);
    
    // Generic server error
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
} 