// Cron endpoint to generate markets for upcoming movies
// This should be called daily by a cron job

import { NextRequest, NextResponse } from 'next/server';
import { generateUpcomingMarkets } from '@/lib/services/marketGenerationService';
import {
  transitionBlindToOpen,
  lockClosedMarkets,
} from '@/lib/services/marketService';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel automatically adds this header for cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // TEMPORARY: Allow unauthenticated access for initial setup
    // TODO: Re-enable after first market generation
    // if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    //   console.error('Unauthorized cron request');
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    console.log('Starting market generation cron job...');

    // Generate new markets
    const result = await generateUpcomingMarkets();

    // Transition markets from blind to open
    const transitionedCount = await transitionBlindToOpen();

    // Lock markets that have reached close time
    const lockedCount = await lockClosedMarkets();

    console.log('Market generation complete:', {
      ...result,
      markets_transitioned_to_open: transitionedCount,
      markets_locked: lockedCount,
    });

    return NextResponse.json({
      success: true,
      ...result,
      markets_transitioned_to_open: transitionedCount,
      markets_locked: lockedCount,
    });
  } catch (error) {
    console.error('Error in market generation cron:', error);
    return NextResponse.json(
      { error: 'Failed to generate markets' },
      { status: 500 }
    );
  }
}
