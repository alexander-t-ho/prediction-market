'use client';

/**
 * DynamicOddsDisplay Component
 *
 * Displays dynamic odds multipliers for market outcomes.
 * Shows:
 * - Popularity ratio (% of bets on each outcome)
 * - Dynamic penalty multiplier (0.7x to 1.3x)
 * - Color-coded value indicator (good/fair/poor)
 */

import { useEffect, useState } from 'react';

interface DynamicOddsResult {
  outcomeId: string;
  outcomeName: string;
  totalStake: number;
  betCount: number;
  popularityRatio: number;
  penaltyMultiplier: number;
  effectiveOdds: string;
}

interface DynamicOddsDisplayProps {
  marketId: string;
  className?: string;
}

export function DynamicOddsDisplay({ marketId, className = '' }: DynamicOddsDisplayProps) {
  const [odds, setOdds] = useState<DynamicOddsResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOdds();
  }, [marketId]);

  const fetchOdds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/markets/${marketId}/odds`);
      const data = await response.json();

      if (data.success) {
        setOdds(data.odds);
      } else {
        setError('Failed to load odds');
      }
    } catch (err) {
      setError('Error loading odds');
      console.error('Error fetching odds:', err);
    } finally {
      setLoading(false);
    }
  };

  const getValueColor = (multiplier: number): string => {
    if (multiplier > 1.05) return 'text-green-600'; // Good value
    if (multiplier < 0.95) return 'text-red-600'; // Poor value
    return 'text-yellow-600'; // Fair value
  };

  const getValueLabel = (multiplier: number): string => {
    if (multiplier > 1.05) return 'Good Value';
    if (multiplier < 0.95) return 'Poor Value';
    return 'Fair Value';
  };

  const getValueBgColor = (multiplier: number): string => {
    if (multiplier > 1.05) return 'bg-green-50 border-green-200';
    if (multiplier < 0.95) return 'bg-red-50 border-red-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-2">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  if (odds.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Dynamic Odds</h3>
        <button
          onClick={fetchOdds}
          className="text-xs text-blue-600 hover:text-blue-700"
          title="Refresh odds"
        >
          ↻ Refresh
        </button>
      </div>

      {odds.map((outcome) => (
        <div
          key={outcome.outcomeId}
          className={`border rounded-lg p-3 ${getValueBgColor(outcome.penaltyMultiplier)}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{outcome.outcomeName}</div>
              <div className="text-xs text-gray-600 mt-1">
                {outcome.betCount} bet{outcome.betCount !== 1 ? 's' : ''} • T$
                {outcome.totalStake.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getValueColor(outcome.penaltyMultiplier)}`}>
                {outcome.effectiveOdds}
              </div>
              <div className={`text-xs font-medium ${getValueColor(outcome.penaltyMultiplier)}`}>
                {getValueLabel(outcome.penaltyMultiplier)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <div>
              Popularity: {(outcome.popularityRatio * 100).toFixed(1)}%
            </div>
            <div title="Dynamic penalty multiplier based on popularity">
              Multiplier: {outcome.penaltyMultiplier.toFixed(2)}x
            </div>
          </div>

          {/* Visual bar showing popularity */}
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${outcome.popularityRatio * 100}%` }}
            ></div>
          </div>
        </div>
      ))}

      <div className="text-xs text-gray-500 mt-3 p-2 bg-gray-50 rounded border border-gray-200">
        <strong>How it works:</strong> Popular positions ({'>'}50%) have reduced payouts
        (penalty). Unpopular positions ({'<'}50%) have increased payouts (bonus). This
        rewards contrarian thinking and reduces bandwagoning.
      </div>
    </div>
  );
}
