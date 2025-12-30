'use client';

/**
 * PayoutBreakdown Component
 *
 * Shows detailed payout calculation breakdown after market resolution.
 * Displays:
 * - Base payout (proportional share)
 * - Dynamic multiplier effect
 * - Contrarian bonus (if applicable)
 * - Final payout
 */

interface PayoutBreakdownProps {
  stake: number;
  basePayout: number;
  dynamicMultiplier: number;
  contrarianBonus: number;
  finalPayout: number;
  won: boolean;
  wasBlindPeriodBet?: boolean;
  wasContrarian?: boolean;
  className?: string;
}

export function PayoutBreakdown({
  stake,
  basePayout,
  dynamicMultiplier,
  contrarianBonus,
  finalPayout,
  won,
  wasBlindPeriodBet = false,
  wasContrarian = false,
  className = '',
}: PayoutBreakdownProps) {
  if (!won) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="text-red-800 font-semibold mb-2">Bet Lost</div>
        <div className="text-sm text-red-700">
          Your stake of T${stake.toFixed(2)} was not returned.
        </div>
      </div>
    );
  }

  const afterDynamic = basePayout * dynamicMultiplier;

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="text-green-800 font-semibold mb-3 flex items-center justify-between">
        <span>Bet Won!</span>
        <span className="text-2xl font-bold">T${finalPayout.toFixed(2)}</span>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 text-sm">
        {/* Base Payout */}
        <div className="flex items-center justify-between py-2 border-b border-green-200">
          <div className="text-gray-700">
            <div className="font-medium">Base Payout</div>
            <div className="text-xs text-gray-500">Proportional share of pool</div>
          </div>
          <div className="font-mono text-green-700">T${basePayout.toFixed(2)}</div>
        </div>

        {/* Dynamic Multiplier */}
        <div className="flex items-center justify-between py-2 border-b border-green-200">
          <div className="text-gray-700">
            <div className="font-medium">
              Dynamic Multiplier
              {dynamicMultiplier > 1.0 && (
                <span className="ml-1 text-xs text-green-600">↑ Bonus</span>
              )}
              {dynamicMultiplier < 1.0 && (
                <span className="ml-1 text-xs text-red-600">↓ Penalty</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Based on popularity at bet time
            </div>
          </div>
          <div className="font-mono">
            <span className="text-gray-600">×</span>{' '}
            <span
              className={
                dynamicMultiplier > 1.0
                  ? 'text-green-700'
                  : dynamicMultiplier < 1.0
                  ? 'text-red-700'
                  : 'text-gray-700'
              }
            >
              {dynamicMultiplier.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* After Dynamic */}
        <div className="flex items-center justify-between py-1 text-xs text-gray-600">
          <div>After Dynamic</div>
          <div className="font-mono">T${afterDynamic.toFixed(2)}</div>
        </div>

        {/* Contrarian Bonus */}
        {contrarianBonus > 1.0 && (
          <>
            <div className="flex items-center justify-between py-2 border-b border-green-200 bg-purple-50 -mx-4 px-4">
              <div className="text-gray-700">
                <div className="font-medium flex items-center gap-1">
                  <span className="text-purple-600">★</span>
                  Contrarian Bonus
                </div>
                <div className="text-xs text-gray-500">
                  Minority position reward
                </div>
              </div>
              <div className="font-mono">
                <span className="text-gray-600">×</span>{' '}
                <span className="text-purple-700 font-bold">{contrarianBonus.toFixed(2)}x</span>
              </div>
            </div>
          </>
        )}

        {/* Final Payout */}
        <div className="flex items-center justify-between py-2 pt-3 border-t-2 border-green-300">
          <div className="text-gray-900 font-semibold">Final Payout</div>
          <div className="font-mono text-lg font-bold text-green-700">
            T${finalPayout.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Badges */}
      {(wasBlindPeriodBet || wasContrarian) && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="text-xs text-gray-600 mb-1">Your bet earned:</div>
          <div className="flex flex-wrap gap-1">
            {wasBlindPeriodBet && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                ⏰ Blind Period Bet
              </span>
            )}
            {wasContrarian && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                ★ Contrarian
              </span>
            )}
          </div>
        </div>
      )}

      {/* Calculation Formula */}
      <div className="mt-3 pt-3 border-t border-green-200">
        <div className="text-xs text-gray-500 font-mono">
          {basePayout.toFixed(2)} × {dynamicMultiplier.toFixed(2)}
          {contrarianBonus > 1.0 && ` × ${contrarianBonus.toFixed(2)}`} ={' '}
          <span className="text-green-700 font-bold">{finalPayout.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
