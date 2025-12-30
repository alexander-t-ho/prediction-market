// POST /api/bets - Place a bet

import { NextRequest, NextResponse } from 'next/server';
import { placeBet } from '@/lib/services/betService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { user_id, market_id, outcome_id, stake } = body;

    // Validate required fields
    if (!user_id || !market_id || !outcome_id || stake === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Place bet
    const result = await placeBet({
      user_id,
      market_id,
      outcome_id,
      stake: parseFloat(stake),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        bet: result.bet,
        new_balance: result.new_balance,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error placing bet:', error);
    return NextResponse.json(
      { error: 'Failed to place bet' },
      { status: 500 }
    );
  }
}
