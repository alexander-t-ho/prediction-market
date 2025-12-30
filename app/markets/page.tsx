'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { MarketCard } from '@/components/features/markets/MarketCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import type { MarketWithStats, MarketFilters, MarketSortOption } from '@/lib/types/market';

export default function MarketsPage() {
  const { user } = useAuth();
  const [markets, setMarkets] = useState<MarketWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<MarketSortOption>('newest');

  useEffect(() => {
    fetchMarkets();
  }, [statusFilter, categoryFilter, searchQuery, sortOption, user]);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const params = new URLSearchParams();

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sort', sortOption);

      const response = await fetch(`/api/markets?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch markets');
      }

      const data = await response.json();
      console.log('API Response:', data); // Debug log
      console.log('Number of markets received:', data.markets?.length || 0);

      // Check if we have markets data
      if (!data.markets || !Array.isArray(data.markets)) {
        console.log('No markets data or not an array');
        setMarkets([]);
        return;
      }

      // Fetch stats for each market in parallel (with error handling)
      const marketsWithStats = await Promise.all(
        data.markets.map(async (market: any) => {
          // Skip if market is undefined or doesn't have an id
          if (!market || !market.id) {
            console.warn('Skipping market without ID:', market);
            return null;
          }

          try {
            const statsResponse = await fetch(
              `/api/markets/${market.id}${user ? `?userId=${user.id}` : ''}`,
              { signal: AbortSignal.timeout(5000) } // 5 second timeout per market
            );

            if (!statsResponse.ok) {
              console.error(`Failed to fetch stats for market ${market.id}: ${statsResponse.status}`);
              // Return basic market data with default stats
              return {
                ...market,
                total_pool: 0,
                total_bets: 0,
                outcomes: [],
                user_bet: null,
              };
            }

            const statsData = await statsResponse.json();
            return statsData.market;
          } catch (error) {
            console.error(`Error fetching stats for market ${market.id}:`, error);
            // Return basic market data with default stats
            return {
              ...market,
              total_pool: 0,
              total_bets: 0,
              outcomes: [],
              user_bet: null,
            };
          }
        })
      );

      // Filter out any null values from the results
      const validMarkets = marketsWithStats.filter((market) => market !== null);
      console.log('Valid markets after fetching stats:', validMarkets.length);
      setMarkets(validMarkets);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-text-primary mb-2">Markets</h1>
        <p className="text-lg text-text-secondary">
          Predict the future of upcoming movies
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[300px]">
            <Input
              type="text"
              placeholder="Search markets or movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-background-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="all">All Statuses</option>
            <option value="blind">Blind Period</option>
            <option value="open">Open</option>
            <option value="locked">Locked</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-background-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="all">All Categories</option>
            <option value="rotten_tomatoes">Rotten Tomatoes</option>
            <option value="box_office">Box Office</option>
          </select>

          {/* Sort */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as MarketSortOption)}
            className="px-4 py-2 bg-background-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="newest">Newest First</option>
            <option value="closing_soon">Closing Soon</option>
            <option value="most_pool">Most Pool Value</option>
          </select>
        </div>
      </div>

      {/* Markets Grid */}
      {loading ? (
        <Loading text="Loading markets..." />
      ) : error ? (
        <div className="bg-negative/10 border border-negative rounded-lg p-6">
          <p className="text-negative">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={fetchMarkets}>
            Retry
          </Button>
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary text-lg mb-4">No markets found</p>
          <p className="text-text-secondary">
            Try adjusting your filters or check back later for new markets
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {markets.filter(m => m && m.id).map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}

      {/* Load More (placeholder for pagination) */}
      {!loading && markets.length > 0 && (
        <div className="mt-8 text-center">
          <Button variant="secondary" onClick={fetchMarkets}>
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
