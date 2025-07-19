import { NextResponse } from 'next/server';

import { getCacheAnalytics } from '@/lib/utils/api-cache';

export async function GET() {
  try {
    const analytics = getCacheAnalytics();

    return NextResponse.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve cache analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
