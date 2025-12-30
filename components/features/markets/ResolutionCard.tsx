'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ResolutionCardProps {
  marketTitle: string;
  marketType: string;
  winningOutcome: string;
  actualValue: number;
  userBet?: {
    outcome: string;
    stake: number;
    won: boolean;
    basePayout: number;
    dynamicMultiplier: number;
    contrarianBonus: number;
    finalPayout: number;
    wasBlindPeriodBet: boolean;
    wasContrarian: boolean;
  };
  tasteMatches?: number;
  trendsetterPointsEarned?: number;
  resolvedAt: Date;
}

export function ResolutionCard({
  marketTitle,
  marketType,
  winningOutcome,
  actualValue,
  userBet,
  tasteMatches,
  trendsetterPointsEarned,
  resolvedAt,
}: ResolutionCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTakes = (amount: number) => {
    return `T$${amount.toFixed(2)}`;
  };

  const getActualValueDisplay = () => {
    if (marketType.includes('rt')) {
      return `${actualValue}% on Rotten Tomatoes`;
    } else if (marketType.includes('box_office')) {
      if (marketType === 'box_office_number_one') {
        return actualValue === 1 ? '#1 at the box office' : `#${actualValue} at the box office`;
      }
      return formatCurrency(actualValue);
    }
    return actualValue;
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-white">{marketTitle}</h3>
          <Badge variant="success">Resolved</Badge>
        </div>
        <p className="text-sm text-gray-400">
          Resolved {resolvedAt.toLocaleDateString()} at {resolvedAt.toLocaleTimeString()}
        </p>
      </div>

      {/* Final Outcome */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-sm text-gray-400 mb-1">Final Outcome</p>
        <p className="text-2xl font-bold text-blue-400 mb-1">{winningOutcome}</p>
        <p className="text-base text-gray-300">{getActualValueDisplay()}</p>
      </div>

      {/* User's Result */}
      {userBet && (
        <div className={`mb-6 p-4 rounded-lg border ${
          userBet.won
            ? 'bg-green-900/20 border-green-700'
            : 'bg-red-900/20 border-red-700'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-lg font-semibold text-white">Your Prediction</p>
            <Badge variant={userBet.won ? 'success' : 'danger'}>
              {userBet.won ? 'WON' : 'LOST'}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">You predicted:</span>
              <span className="text-white font-medium">{userBet.outcome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Stake:</span>
              <span className="text-white font-medium">{formatTakes(userBet.stake)}</span>
            </div>

            {userBet.won && (
              <>
                <div className="border-t border-gray-700 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Base payout:</span>
                  <span className="text-white">{formatTakes(userBet.basePayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dynamic odds multiplier:</span>
                  <span className="text-white">{userBet.dynamicMultiplier.toFixed(2)}x</span>
                </div>
                {userBet.wasContrarian && (
                  <div className="flex justify-between">
                    <span className="text-purple-400 flex items-center gap-1">
                      <span>🌟</span> Contrarian bonus:
                    </span>
                    <span className="text-purple-400 font-semibold">{userBet.contrarianBonus.toFixed(2)}x</span>
                  </div>
                )}
                <div className="border-t border-gray-700 my-2"></div>
                <div className="flex justify-between text-lg">
                  <span className="text-green-400 font-semibold">Final payout:</span>
                  <span className="text-green-400 font-bold">{formatTakes(userBet.finalPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Net profit:</span>
                  <span className="text-green-400 font-semibold">
                    +{formatTakes(userBet.finalPayout - userBet.stake)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Special Badges */}
          <div className="flex gap-2 mt-3">
            {userBet.wasBlindPeriodBet && (
              <Badge variant="warning" size="sm">
                👁️ Blind Period
              </Badge>
            )}
            {userBet.wasContrarian && (
              <Badge variant="info" size="sm">
                🌟 Contrarian
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Trendsetter Points */}
      {trendsetterPointsEarned && trendsetterPointsEarned > 0 && (
        <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-400">Trendsetter Points Earned</span>
            <span className="text-xl font-bold text-amber-400">+{trendsetterPointsEarned}</span>
          </div>
        </div>
      )}

      {/* Taste Matches */}
      {tasteMatches && tasteMatches > 0 && (
        <div className="p-3 bg-purple-900/20 border border-purple-700 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-purple-400">Taste Matches Found</span>
            <span className="text-xl font-bold text-purple-400">{tasteMatches}</span>
          </div>
          <p className="text-xs text-purple-300 mt-1">
            You matched with {tasteMatches} {tasteMatches === 1 ? 'user' : 'users'} on this prediction
          </p>
        </div>
      )}
    </Card>
  );
}
