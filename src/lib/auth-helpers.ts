import { createAuthenticatedServerClient } from './supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

/**
 * Secure API authentication helper - 2025 Best Practice
 * Always verifies user authentication before allowing API access
 */
export async function withAuthentication(
  request: NextRequest,
  handler: (user: User, supabase: SupabaseClient<Database>) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const supabase = await createAuthenticatedServerClient()
    
    // CRITICAL: Always use getUser() for server-side auth validation
    // This makes a request to Supabase Auth server to verify the token
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.warn('Unauthorized API access attempt:', error?.message)
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' }, 
        { status: 401 }
      )
    }

    // User is authenticated, proceed with the handler
    return await handler(user, supabase)
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 503 }
    )
  }
}

/**
 * Rate limiting helper (simple in-memory version for development)
 * For production, consider using Redis-based rate limiting
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  request: NextRequest,
  maxRequests: number = 10,
  windowMs: number = 60000
): NextResponse | null {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
  const now = Date.now()
  const key = `rate-limit:${ip}`
  
  const current = rateLimitMap.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return null
  }
  
  if (current.count >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }
  
  current.count++
  return null
} 