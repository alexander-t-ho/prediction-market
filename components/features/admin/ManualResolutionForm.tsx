'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Market {
  id: string;
  title: string;
  marketType: string;
  releaseDate: string;
  imdbId: string | null;
  outcomes: {
    id: string;
    label: string;
    minValue?: number;
    maxValue?: number;
  }[];
}

interface ManualResolutionFormProps {
  market: Market;
  onResolve: (outcomeId: string, actualValue: number) => Promise<void>;
  onCancel: () => void;
}

export function ManualResolutionForm({
  market,
  onResolve,
  onCancel,
}: ManualResolutionFormProps) {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('');
  const [actualValue, setActualValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [autoFetchLoading, setAutoFetchLoading] = useState(false);

  const isRTMarket = market.marketType.includes('rt');
  const isBoxOfficeMarket = market.marketType.includes('box_office');

  const handleAutoFetch = async () => {
    setAutoFetchLoading(true);
    setError('');

    try {
      if (isRTMarket) {
        // Fetch from OMDb
        const endpoint = market.imdbId
          ? `/api/admin/rt-score?imdbId=${market.imdbId}`
          : `/api/admin/rt-score?title=${encodeURIComponent(market.title)}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.success && data.data.tomatometer !== null) {
          setActualValue(data.data.tomatometer.toString());

          // Auto-select outcome based on value
          if (market.marketType === 'rt_binary') {
            const threshold = parseInt(market.title.match(/(\d+)%/)?.[1] || '70', 10);
            const winningOutcome = data.data.tomatometer >= threshold
              ? market.outcomes.find(o => o.label.toLowerCase().includes('yes'))
              : market.outcomes.find(o => o.label.toLowerCase().includes('no'));
            if (winningOutcome) setSelectedOutcomeId(winningOutcome.id);
          } else if (market.marketType === 'rt_range') {
            const score = data.data.tomatometer;
            const winningOutcome = market.outcomes.find(o =>
              (o.minValue || 0) <= score && score <= (o.maxValue || 100)
            );
            if (winningOutcome) setSelectedOutcomeId(winningOutcome.id);
          }
        } else {
          setError(data.message || 'RT score not available');
        }
      } else if (isBoxOfficeMarket) {
        // Fetch box office data
        const response = await fetch(
          `/api/admin/box-office?title=${encodeURIComponent(market.title)}&releaseDate=${market.releaseDate}`
        );
        const data = await response.json();

        if (data.success && data.available) {
          const gross = data.data.openingWeekendGross;
          const rank = data.data.rank;

          if (market.marketType === 'box_office_number_one') {
            setActualValue(rank.toString());
            const winningOutcome = rank === 1
              ? market.outcomes.find(o => o.label.toLowerCase().includes('yes'))
              : market.outcomes.find(o => o.label.toLowerCase().includes('no'));
            if (winningOutcome) setSelectedOutcomeId(winningOutcome.id);
          } else {
            setActualValue(gross.toString());

            // Auto-select outcome
            if (market.marketType === 'box_office_binary') {
              const threshold = parseInt(market.title.match(/\$(\d+)M/)?.[1] || '100', 10) * 1_000_000;
              const winningOutcome = gross >= threshold
                ? market.outcomes.find(o => o.label.toLowerCase().includes('yes'))
                : market.outcomes.find(o => o.label.toLowerCase().includes('no'));
              if (winningOutcome) setSelectedOutcomeId(winningOutcome.id);
            } else if (market.marketType === 'box_office_range') {
              const winningOutcome = market.outcomes.find(o =>
                (o.minValue || 0) <= gross && (gross < (o.maxValue || Infinity))
              );
              if (winningOutcome) setSelectedOutcomeId(winningOutcome.id);
            }
          }
        } else {
          setError('Box office data not available via API. Please enter manually.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setAutoFetchLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOutcomeId) {
      setError('Please select a winning outcome');
      return;
    }

    if (!actualValue) {
      setError('Please enter the actual value');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onResolve(selectedOutcomeId, parseFloat(actualValue));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve market');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Resolve Market</h2>
        <h3 className="text-lg text-gray-300 mb-1">{market.title}</h3>
        <Badge variant="warning">
          {market.marketType.replace(/_/g, ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Auto-Fetch Button */}
      <div className="mb-6">
        <Button
          onClick={handleAutoFetch}
          disabled={autoFetchLoading}
          variant="secondary"
          className="w-full"
        >
          {autoFetchLoading ? 'Fetching...' : 'Auto-Fetch Data from API'}
        </Button>
        <p className="text-xs text-gray-400 mt-1">
          {isRTMarket && 'Fetch Rotten Tomatoes score from OMDb'}
          {isBoxOfficeMarket && 'Fetch box office data from external API'}
        </p>
      </div>

      {/* Actual Value Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Actual Value
        </label>
        <Input
          type="number"
          value={actualValue}
          onChange={(e) => setActualValue(e.target.value)}
          placeholder={
            isRTMarket
              ? 'Enter RT score (0-100)'
              : market.marketType === 'box_office_number_one'
              ? 'Enter weekend rank (1, 2, 3...)'
              : 'Enter opening weekend gross (USD)'
          }
        />
        <p className="text-xs text-gray-400 mt-1">
          {isRTMarket && 'Rotten Tomatoes Tomatometer percentage (0-100)'}
          {isBoxOfficeMarket && market.marketType === 'box_office_number_one' && 'Box office ranking (1 = #1)'}
          {isBoxOfficeMarket && market.marketType !== 'box_office_number_one' && 'Domestic opening weekend gross in USD'}
        </p>
      </div>

      {/* Outcome Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Winning Outcome
        </label>
        <div className="space-y-2">
          {market.outcomes.map((outcome) => (
            <button
              key={outcome.id}
              onClick={() => setSelectedOutcomeId(outcome.id)}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${
                selectedOutcomeId === outcome.id
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="font-medium">{outcome.label}</div>
              {outcome.minValue !== undefined && outcome.maxValue !== undefined && (
                <div className="text-xs text-gray-400 mt-1">
                  {isRTMarket && `${outcome.minValue}% - ${outcome.maxValue}%`}
                  {isBoxOfficeMarket && `$${(outcome.minValue / 1_000_000).toFixed(0)}M - $${(outcome.maxValue / 1_000_000).toFixed(0)}M`}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={loading || !selectedOutcomeId || !actualValue}
          className="flex-1"
        >
          {loading ? 'Resolving...' : 'Resolve Market'}
        </Button>
        <Button onClick={onCancel} variant="secondary" disabled={loading}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}
