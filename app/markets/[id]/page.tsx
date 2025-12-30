'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { MarketDetail } from '@/components/features/markets/MarketDetail';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import type { MarketWithStats } from '@/lib/types/market';

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [market, setMarket] = useState<MarketWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const marketId = params.id as string;

  useEffect(() => {
    if (marketId) {
      fetchMarket();
    }
  }, [marketId, user]);

  const fetchMarket = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/markets/${marketId}${user ? `?userId=${user.id}` : ''}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch market');
      }

      const data = await response.json();
      setMarket(data.market);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBetPlaced = () => {
    // Refresh market data after bet is placed
    fetchMarket();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" text="Loading market..." />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-negative bg-negative/10 p-6 text-center">
            <h2 className="mb-2 text-xl font-semibold text-negative">
              Market Not Found
            </h2>
            <p className="mb-4 text-text-secondary">
              {error || 'The market you are looking for does not exist.'}
            </p>
            <Button variant="secondary" onClick={() => router.push('/markets')}>
              Back to Markets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/markets')}
          className="gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Markets
        </Button>
      </div>

      {/* Market Detail */}
      <MarketDetail market={market} onBetPlaced={handleBetPlaced} />
    </div>
  );
}
