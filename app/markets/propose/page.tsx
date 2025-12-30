'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import type { TMDBMovie } from '@/lib/api/tmdb';

export default function ProposeMarketPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<'search' | 'details'>('search');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBMovie[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null);

  // Proposal state
  const [category, setCategory] = useState<'rotten_tomatoes' | 'box_office'>('rotten_tomatoes');
  const [marketType, setMarketType] = useState<'binary' | 'range_bracket'>('binary');
  const [threshold, setThreshold] = useState('');
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not logged in
  if (!user) {
    router.push('/');
    return null;
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      setError('');
      const response = await fetch(
        `/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        throw new Error('Failed to search movies');
      }

      const data = await response.json();
      setSearchResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectMovie = (movie: TMDBMovie) => {
    setSelectedMovie(movie);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMovie) return;

    // Validation
    if (marketType === 'binary' && !threshold) {
      setError('Please enter a threshold value');
      return;
    }

    if (justification.length < 20) {
      setError('Justification must be at least 20 characters');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch('/api/markets/propose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: selectedMovie.id.toString(),
          movieTitle: selectedMovie.title,
          releaseDate: selectedMovie.release_date,
          category,
          marketType,
          threshold: marketType === 'binary' ? parseFloat(threshold) : undefined,
          justification,
          posterPath: selectedMovie.poster_path,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit proposal');
      }

      // Success - redirect to markets page
      router.push('/markets?proposed=true');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Get threshold options based on category
  const getThresholdOptions = () => {
    if (category === 'rotten_tomatoes') {
      return [60, 70, 80, 90];
    }
    return [25, 50, 75, 100, 150, 200]; // in millions
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-text-primary">
          Propose a Market
        </h1>
        <p className="text-lg text-text-secondary">
          Suggest a new prediction market for an upcoming movie
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'search'
                ? 'bg-accent-primary text-white'
                : 'bg-positive text-white'
              }`}
          >
            {step === 'details' ? '✓' : '1'}
          </div>
          <span className="font-medium text-text-primary">Select Movie</span>
        </div>
        <div className="h-px flex-1 bg-border" />
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 'details'
                ? 'bg-accent-primary text-white'
                : 'bg-background-secondary text-text-secondary'
              }`}
          >
            2
          </div>
          <span
            className={`font-medium ${step === 'details' ? 'text-text-primary' : 'text-text-secondary'
              }`}
          >
            Market Details
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card variant="bordered" padding="md" className="mb-6 border-negative bg-negative/10">
          <p className="text-negative">{error}</p>
        </Card>
      )}

      {/* Step 1: Search Movie */}
      {step === 'search' && (
        <Card variant="elevated" padding="lg">
          <h2 className="mb-4 text-2xl font-semibold text-text-primary">
            Search for a Movie
          </h2>

          <div className="mb-6 flex gap-2">
            <Input
              type="text"
              placeholder="Enter movie title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searching && <Loading text="Searching movies..." />}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-text-primary">Search Results</h3>
              {searchResults.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => handleSelectMovie(movie)}
                  className="w-full rounded-lg border border-border bg-background-secondary p-4 text-left transition-colors hover:border-accent-primary hover:bg-background-elevated"
                >
                  <div className="flex items-start gap-4">
                    {movie.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        alt={movie.title}
                        className="h-24 w-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary">{movie.title}</h4>
                      <p className="text-sm text-text-secondary">
                        Release: {movie.release_date || 'TBA'}
                      </p>
                      {movie.overview && (
                        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">
                          {movie.overview}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Step 2: Market Details */}
      {step === 'details' && selectedMovie && (
        <form onSubmit={handleSubmit}>
          <Card variant="elevated" padding="lg" className="mb-6">
            <div className="mb-6 flex items-start gap-4">
              {selectedMovie.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w154${selectedMovie.poster_path}`}
                  alt={selectedMovie.title}
                  className="h-32 w-24 rounded object-cover"
                />
              )}
              <div>
                <h2 className="mb-1 text-2xl font-semibold text-text-primary">
                  {selectedMovie.title}
                </h2>
                <p className="text-text-secondary">
                  Release: {selectedMovie.release_date || 'TBA'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('search')}
                  className="mt-2"
                >
                  Change Movie
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Category */}
              <div>
                <label className="mb-2 block font-semibold text-text-primary">
                  Category
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCategory('rotten_tomatoes')}
                    className={`flex-1 rounded-lg border p-4 transition-colors ${category === 'rotten_tomatoes'
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border bg-background-secondary hover:border-accent-primary/50'
                      }`}
                  >
                    <Badge variant="danger" className="mb-2">
                      🍅 Rotten Tomatoes
                    </Badge>
                    <p className="text-sm text-text-secondary">
                      Predict critic score percentage
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('box_office')}
                    className={`flex-1 rounded-lg border p-4 transition-colors ${category === 'box_office'
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border bg-background-secondary hover:border-accent-primary/50'
                      }`}
                  >
                    <Badge variant="success" className="mb-2">
                      💰 Box Office
                    </Badge>
                    <p className="text-sm text-text-secondary">
                      Predict opening weekend gross
                    </p>
                  </button>
                </div>
              </div>

              {/* Market Type */}
              <div>
                <label className="mb-2 block font-semibold text-text-primary">
                  Market Type
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMarketType('binary')}
                    className={`flex-1 rounded-lg border p-4 transition-colors ${marketType === 'binary'
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border bg-background-secondary hover:border-accent-primary/50'
                      }`}
                  >
                    <p className="mb-1 font-semibold text-text-primary">Binary</p>
                    <p className="text-sm text-text-secondary">
                      Above/Below a threshold
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketType('range_bracket')}
                    className={`flex-1 rounded-lg border p-4 transition-colors ${marketType === 'range_bracket'
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border bg-background-secondary hover:border-accent-primary/50'
                      }`}
                  >
                    <p className="mb-1 font-semibold text-text-primary">Range Bracket</p>
                    <p className="text-sm text-text-secondary">
                      Multiple outcome ranges
                    </p>
                  </button>
                </div>
              </div>

              {/* Threshold (Binary only) */}
              {marketType === 'binary' && (
                <div>
                  <label className="mb-2 block font-semibold text-text-primary">
                    Threshold {category === 'box_office' && '(in millions)'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {getThresholdOptions().map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setThreshold(value.toString())}
                        className={`rounded-lg border px-4 py-2 transition-colors ${threshold === value.toString()
                            ? 'border-accent-primary bg-accent-primary text-white'
                            : 'border-border bg-background-secondary text-text-primary hover:border-accent-primary/50'
                          }`}
                      >
                        {category === 'rotten_tomatoes' ? `${value}%` : `$${value}M`}
                      </button>
                    ))}
                    <Input
                      type="number"
                      placeholder="Custom"
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              )}

              {/* Justification */}
              <div>
                <label className="mb-2 block font-semibold text-text-primary">
                  Justification
                  <span className="ml-2 text-sm font-normal text-text-secondary">
                    (min 20 characters)
                  </span>
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Why is this market interesting? What makes this prediction compelling?"
                  className="w-full rounded-lg border border-border bg-background-secondary px-4 py-3 text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                  rows={4}
                  required
                  minLength={20}
                />
                <p className="mt-1 text-sm text-text-secondary">
                  {justification.length} / 20 characters
                </p>
              </div>
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/markets')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Submitting...' : 'Submit Proposal'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
