import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'Test endpoint for security headers',
    timestamp: new Date().toISOString()
  })
} 