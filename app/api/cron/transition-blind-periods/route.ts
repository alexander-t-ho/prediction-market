import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { markets } from '@/db/schema'
import { eq, and, lte } from 'drizzle-orm'
import { captureError, captureMessage } from '@/lib/monitoring'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const marketsToTransition = await db
      .select()
      .from(markets)
      .where(
        and(
          eq(markets.status, 'open'),
          lte(markets.blindPeriodEnds, now)
        )
      )

    let transitionedCount = 0

    for (const market of marketsToTransition) {
      try {
        await db
          .update(markets)
          .set({
            status: 'open',
          })
          .where(eq(markets.id, market.id))

        transitionedCount++
      } catch (error) {
        captureError(error as Error, {
          marketId: market.id,
          operation: 'transition-blind-period',
        })
      }
    }

    captureMessage(
      `Transitioned ${transitionedCount} markets from blind to open period`,
      'info'
    )

    return NextResponse.json({
      success: true,
      transitioned: transitionedCount,
      checked: marketsToTransition.length,
    })
  } catch (error) {
    captureError(error as Error, { operation: 'transition-blind-periods' })

    return NextResponse.json(
      { error: 'Failed to transition blind periods' },
      { status: 500 }
    )
  }
}
