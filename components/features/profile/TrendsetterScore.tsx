'use client';

/**
 * TrendsetterScore Component
 *
 * Displays user's trendsetter score and badges.
 * Shows:
 * - Total trendsetter points
 * - Breakdown of blind/contrarian bets
 * - Earned badges
 * - Leaderboard rank (optional)
 */

import { useEffect, useState } from 'react';

interface TrendsetterScore {
  userId: string;
  totalPoints: number;
  blindBets: number;
  contrarianBets: number;
  correctBlindBets: number;
  correctContrarianBets: number;
  rank?: number;
}

interface TrendsetterScoreProps {
  userId: string;
  showRank?: boolean;
  compact?: boolean;
  className?: string;
}

export function TrendsetterScore({
  userId,
  showRank = false,
  compact = false,
  className = '',
}: TrendsetterScoreProps) {
  const [score, setScore] = useState<TrendsetterScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScore();
  }, [userId]);

  const fetchScore = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/trendsetter-score`);
      const data = await response.json();

      if (data.success) {
        setScore(data.score);
      }
    } catch (err) {
      console.error('Error fetching trendsetter score:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBadges = (): string[] => {
    if (!score) return [];

    const badges: string[] = [];

    if (score.blindBets >= 10) badges.push('Early Bird');
    if (score.contrarianBets >= 10) badges.push('Maverick');
    if (score.correctBlindBets + score.correctContrarianBets >= 20) badges.push('Oracle');
    if (score.correctContrarianBets >= 25) badges.push('Contrarian Legend');
    if (score.correctBlindBets >= 15) badges.push('Blind Faith');

    return badges;
  };

  const getBadgeEmoji = (badge: string): string => {
    switch (badge) {
      case 'Early Bird':
        return '🐦';
      case 'Maverick':
        return '🤠';
      case 'Oracle':
        return '🔮';
      case 'Contrarian Legend':
        return '👑';
      case 'Blind Faith':
        return '🎯';
      default:
        return '⭐';
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!score) {
    return null;
  }

  const badges = getBadges();

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          <span className="text-purple-600 font-bold">★</span>
          <span className="font-semibold text-gray-900">{score.totalPoints}</span>
          <span className="text-xs text-gray-500">points</span>
        </div>
        {badges.length > 0 && (
          <div className="flex gap-1">
            {badges.slice(0, 3).map((badge) => (
              <span key={badge} title={badge} className="text-sm">
                {getBadgeEmoji(badge)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-purple-600">★</span>
            Trendsetter Score
          </h3>
          <p className="text-xs text-gray-600">Rewarding early & contrarian predictions</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-purple-600">{score.totalPoints}</div>
          <div className="text-xs text-gray-500">points</div>
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <div className="text-xs text-gray-600 mb-1">Blind Period Bets</div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-bold text-amber-600">{score.blindBets}</div>
            <div className="text-xs text-gray-500">
              ({score.correctBlindBets} correct)
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 border border-purple-100">
          <div className="text-xs text-gray-600 mb-1">Contrarian Bets</div>
          <div className="flex items-baseline gap-1">
            <div className="text-2xl font-bold text-purple-600">{score.contrarianBets}</div>
            <div className="text-xs text-gray-500">
              ({score.correctContrarianBets} correct)
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-700 mb-2">Badges Earned</div>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <div
                key={badge}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs font-medium text-purple-700 border border-purple-200"
              >
                <span>{getBadgeEmoji(badge)}</span>
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rank */}
      {showRank && score.rank && (
        <div className="pt-3 border-t border-purple-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Leaderboard Rank</span>
            <span className="font-bold text-purple-600">#{score.rank}</span>
          </div>
        </div>
      )}

      {/* How Points Work */}
      <div className="mt-4 pt-3 border-t border-purple-200">
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer font-medium text-gray-700 hover:text-purple-600">
            How points work
          </summary>
          <div className="mt-2 space-y-1 ml-2">
            <div>• Blind period bet: +1 point</div>
            <div>• Contrarian bet: +2 points</div>
            <div>• Correct blind bet: +2 bonus points</div>
            <div>• Correct contrarian bet: +5 bonus points</div>
            <div className="text-purple-600 mt-2">
              Max: +10 points for a correct blind contrarian bet!
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
