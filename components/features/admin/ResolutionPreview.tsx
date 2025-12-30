'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ResolutionPreviewProps {
  payoutSummary: {
    totalPool: number;
    totalWinningStakes: number;
    totalPayouts: number;
    winnerCount: number;
  };
  winnersCount: number;
  losersCount: number;
  averageWinnerPayout: number;
  totalPointsAwarded: number;
}

export function ResolutionPreview({
  payoutSummary,
  winnersCount,
  losersCount,
  averageWinnerPayout,
  totalPointsAwarded,
}: ResolutionPreviewProps) {
  const formatTakes = (amount: number) => `T$${amount.toFixed(2)}`;

  return (
    <Card className="p-6 bg-blue-900/10 border-blue-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-1">Resolution Preview</h3>
        <p className="text-sm text-gray-400">Review the impact before confirming</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Total Pool</p>
          <p className="text-xl font-bold text-white">{formatTakes(payoutSummary.totalPool)}</p>
        </div>

        <div className="p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Total Payouts</p>
          <p className="text-xl font-bold text-green-400">{formatTakes(payoutSummary.totalPayouts)}</p>
        </div>

        <div className="p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Winners</p>
          <p className="text-xl font-bold text-green-400">{winnersCount}</p>
        </div>

        <div className="p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Losers</p>
          <p className="text-xl font-bold text-red-400">{losersCount}</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between p-2 bg-gray-800 rounded">
          <span className="text-gray-400">Average winner payout:</span>
          <span className="text-white font-medium">{formatTakes(averageWinnerPayout)}</span>
        </div>

        <div className="flex justify-between p-2 bg-gray-800 rounded">
          <span className="text-gray-400">Winning stakes:</span>
          <span className="text-white font-medium">{formatTakes(payoutSummary.totalWinningStakes)}</span>
        </div>

        <div className="flex justify-between p-2 bg-amber-900/20 rounded">
          <span className="text-amber-400">Trendsetter points to award:</span>
          <span className="text-amber-400 font-medium">+{totalPointsAwarded}</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
        <p className="text-xs text-yellow-400">
          ⚠️ This action cannot be undone easily. Please verify the winning outcome is correct before proceeding.
        </p>
      </div>
    </Card>
  );
}
