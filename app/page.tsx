"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { MarketCard } from "@/components/features/markets/MarketCard";
import type { MarketWithStats } from "@/lib/types/market";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [closingSoonMarkets, setClosingSoonMarkets] = useState<MarketWithStats[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  useEffect(() => {
    fetchClosingSoonMarkets();
  }, [user]);

  const fetchClosingSoonMarkets = async () => {
    try {
      setLoadingMarkets(true);
      const response = await fetch('/api/markets/closing-soon');
      if (response.ok) {
        const data = await response.json();
        setClosingSoonMarkets(data.markets || []);
      }
    } catch (error) {
      console.error('Failed to fetch closing soon markets:', error);
    } finally {
      setLoadingMarkets(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-text-primary md:text-5xl">
          Welcome to HotTake
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-text-secondary">
          Put your opinions to the test. Predict movie performance and earn rewards for authentic
          predictions, not just following the crowd.
        </p>

        {!user && (
          <div className="flex justify-center gap-4">
            <Button size="lg">Get Started</Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="mb-12 grid gap-6 md:grid-cols-3">
        <Card variant="elevated" padding="lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blind-period/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blind-period"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-text-primary">Blind Betting Period</h3>
          <p className="text-text-secondary">
            First 48 hours hide odds to capture your authentic opinion before the crowd influences
            you.
          </p>
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-contrarian/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-contrarian"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-text-primary">Contrarian Bonuses</h3>
          <p className="text-text-secondary">
            Get a 1.25x multiplier when you correctly predict against the majority. Courage pays.
          </p>
        </Card>

        <Card variant="elevated" padding="lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-primary/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-accent-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-text-primary">Taste Matching</h3>
          <p className="text-text-secondary">
            Discover users with similar prediction patterns and find your taste tribe.
          </p>
        </Card>
      </div>

      {/* Markets Available */}
      {closingSoonMarkets.length > 0 && (
        <div className="mb-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-text-primary">Closing Soon</h2>
            <Button variant="ghost" onClick={() => router.push('/markets')}>
              View All →
            </Button>
          </div>

          {loadingMarkets ? (
            <Loading text="Loading markets..." />
          ) : (
            <div className="space-y-4">
              {closingSoonMarkets.slice(0, 3).map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA Card */}
      <Card variant="elevated" padding="lg" className="text-center">
        <h3 className="mb-2 text-xl font-semibold text-text-primary">Start Predicting</h3>
        <p className="mb-4 text-text-secondary">
          Markets are live! Browse upcoming movie predictions and place your bets.
        </p>
        <div className="flex justify-center gap-3">
          <Button size="lg" onClick={() => router.push('/markets')}>
            View All Markets
          </Button>
          {user && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/markets/propose')}
            >
              Propose Market
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
