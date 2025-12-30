'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BlindPeriodIndicator } from '@/components/ui/BlindPeriodIndicator';
import { Button } from '@/components/ui/Button';
import type { MarketWithStats } from '@/lib/types/market';
import { getPosterUrl } from '@/lib/api/tmdb';

interface MarketCardProps {
  market: MarketWithStats;
}

export function MarketCard({ market }: MarketCardProps) {
  const isBlindPeriod = market.status === 'blind';

  // Access the poster path - try both camelCase and snake_case
  const posterPath = (market as any).moviePosterPath || market.movie_poster_path;
  const movieTitle = (market as any).movieTitle || market.movie_title;

  const posterUrl = posterPath
    ? getPosterUrl(posterPath, 'w342')
    : '/images/poster-placeholder.svg';

  // Debug: Log poster info
  console.log(`Market: ${movieTitle}`, {
    posterPath,
    posterUrl,
    market,
  });

  // Calculate time remaining
  const getTimeRemaining = () => {
    const now = new Date();
    const target = market.status === 'blind'
      ? new Date(market.blind_period_ends_at)
      : new Date(market.closes_at);

    const diff = target.getTime() - now.getTime();

    if (diff < 0) return 'Closed';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  // Get category badge
  const getCategoryBadge = () => {
    if (market.category === 'rotten_tomatoes') {
      return <Badge variant="info">RT Score</Badge>;
    }
    if (market.category === 'box_office') {
      return <Badge variant="success">Box Office</Badge>;
    }
    return null;
  };

  // Get leading outcome (highest percentage)
  const getLeadingOutcome = () => {
    if (isBlindPeriod || !market.outcomes || market.outcomes.length === 0) return null;

    const sorted = [...market.outcomes].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
    return sorted[0];
  };

  const leadingOutcome = getLeadingOutcome();

  return (
    <Card variant="elevated" className="hover:border-accent-primary transition-colors">
      <div className="flex gap-4">
        {/* Movie Poster */}
        <div className="flex-shrink-0">
          <img
            src={posterUrl || '/images/poster-placeholder.svg'}
            alt={movieTitle}
            className="w-24 h-36 object-cover rounded bg-background-secondary"
            onError={(e) => {
              console.error(`Failed to load poster for ${movieTitle}:`, posterUrl);
              e.currentTarget.src = '/images/poster-placeholder.svg';
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-1 line-clamp-2">
                {market.title}
              </h3>
              <p className="text-sm text-text-secondary">{movieTitle}</p>
            </div>
            {getCategoryBadge()}
          </div>

          {/* Market Info */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-text-secondary">
              Pool: <span className="text-text-primary font-medium">T${(market.total_pool ?? 0).toFixed(2)}</span>
            </span>
            <span className="text-sm text-text-secondary">
              {market.total_bets ?? 0} {(market.total_bets ?? 0) === 1 ? 'bet' : 'bets'}
            </span>
          </div>

          {/* Blind Period or Distribution */}
          {isBlindPeriod ? (
            <BlindPeriodIndicator endsAt={market.blind_period_ends_at} />
          ) : leadingOutcome ? (
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Leading</span>
                <span className="text-text-primary font-medium">
                  {(leadingOutcome.percentage ?? 0).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-background-secondary rounded-full h-2">
                <div
                  className="bg-accent-primary rounded-full h-2 transition-all"
                  style={{ width: `${leadingOutcome.percentage ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-text-secondary mt-1">{leadingOutcome.label}</p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary mb-3">No bets yet</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={market.status === 'blind' || market.status === 'open' ? 'success' : 'default'}>
                {market.status.charAt(0).toUpperCase() + market.status.slice(1)}
              </Badge>
              {market.user_bet && (
                <span className="text-xs text-accent-primary">
                  You bet: {market.user_bet.outcome_label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">
                {getTimeRemaining()}
              </span>
              <Link href={`/markets/${market.id}`}>
                <Button size="sm" variant="primary">
                  {market.user_bet ? 'View' : 'Place Bet'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
