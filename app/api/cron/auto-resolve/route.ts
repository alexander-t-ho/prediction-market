/**
 * Auto-Resolution Cron Job
 *
 * Automatically resolves markets based on external data sources:
 * - RT markets: 14 days post-release (minimum 20 reviews)
 * - Box Office markets: Monday after opening weekend (3+ days post-release)
 *
 * Schedule: Run daily at 12:00 PM UTC
 *
 * Usage:
 * - Production: Vercel Cron (configured in vercel.json)
 * - Development: Manual trigger via POST /api/cron/auto-resolve
 */

import { NextRequest, NextResponse } from 'next/server';
import { runAutoResolution } from '@/lib/services/autoResolutionService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max execution

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron] Auto-resolution job started');
    const startTime = Date.now();

    // Run auto-resolution
    const result = await runAutoResolution();

    const duration = Date.now() - startTime;

    console.log('[Cron] Auto-resolution job completed', {
      duration: `${duration}ms`,
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      manualRequired: result.manualRequired,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        manualRequired: result.manualRequired,
      },
      results: result.results,
    });
  } catch (error) {
    console.error('[Cron] Auto-resolution job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'GET method not allowed in production. Use POST.' },
      { status: 405 }
    );
  }

  // In development, allow GET to trigger manually
  return POST(request);
}
