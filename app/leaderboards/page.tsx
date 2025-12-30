"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import LeaderboardCard from "@/components/features/leaderboards/LeaderboardCard";
import { LeaderboardEntry } from "@/components/features/leaderboards/LeaderboardTable";

interface LeaderboardsData {
  topEarners: LeaderboardEntry[];
  mostAccurate: LeaderboardEntry[];
  topContrarians: LeaderboardEntry[];
  trendsetters: LeaderboardEntry[];
  weeklyStars: LeaderboardEntry[];
}

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const [leaderboards, setLeaderboards] = useState<LeaderboardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/leaderboards");
      if (!response.ok) throw new Error("Failed to fetch leaderboards");
      const data = await response.json();
      setLeaderboards(data);
    } catch (err) {
      console.error("Error fetching leaderboards:", err);
      setError("Failed to load leaderboards. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p className="text-text-secondary">Loading leaderboards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchLeaderboards}
            className="mt-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!leaderboards) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          🏆 Leaderboards
        </h1>
        <p className="text-text-secondary text-lg">
          See who's dominating the prediction markets
        </p>
      </div>

      {/* Leaderboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Earners */}
        <LeaderboardCard
          title="Top Earners"
          description="Highest balance - the richest predictors"
          icon="💰"
          entries={leaderboards.topEarners}
          href="/leaderboards/top-earners"
          scoreLabel="Balance"
          scoreFormatter={(score) => `T$${score.toLocaleString()}`}
          accentColor="text-green-400"
        />

        {/* Most Accurate */}
        <LeaderboardCard
          title="Most Accurate"
          description="Best prediction accuracy (min 10 predictions)"
          icon="🎯"
          entries={leaderboards.mostAccurate}
          href="/leaderboards/most-accurate"
          scoreLabel="Accuracy"
          scoreFormatter={(score) => `${score.toFixed(1)}%`}
          accentColor="text-blue-400"
        />

        {/* Top Contrarians */}
        <LeaderboardCard
          title="Top Contrarians"
          description="Most independent thinkers (min 10 predictions)"
          icon="🦁"
          entries={leaderboards.topContrarians}
          href="/leaderboards/top-contrarians"
          scoreLabel="Contrarian Rate"
          scoreFormatter={(score) => `${score.toFixed(1)}%`}
          accentColor="text-purple-400"
        />

        {/* Trendsetters */}
        <LeaderboardCard
          title="Trendsetters"
          description="Early and original bettors"
          icon="💫"
          entries={leaderboards.trendsetters}
          href="/leaderboards/trendsetters"
          scoreLabel="Points"
          scoreFormatter={(score) => score.toLocaleString()}
          accentColor="text-amber-400"
        />

        {/* Weekly Stars */}
        <LeaderboardCard
          title="Weekly Stars"
          description="Highest earnings this week"
          icon="⚡"
          entries={leaderboards.weeklyStars}
          href="/leaderboards/weekly-stars"
          scoreLabel="Weekly Earnings"
          scoreFormatter={(score) => `T$${score.toLocaleString()}`}
          accentColor="text-yellow-400"
        />
      </div>

      {/* User's Ranks Section */}
      {user && (
        <div className="mt-12 bg-background-elevated rounded-lg p-6 border border-border-color">
          <h2 className="text-2xl font-bold text-white mb-4">Your Rankings</h2>
          <UserRanks userId={user.id} />
        </div>
      )}
    </div>
  );
}

function UserRanks({ userId }: { userId: string }) {
  const [ranks, setRanks] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRanks();
  }, [userId]);

  const fetchUserRanks = async () => {
    try {
      const response = await fetch(`/api/leaderboards/user/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user ranks");
      const data = await response.json();
      setRanks(data.ranks);
    } catch (err) {
      console.error("Error fetching user ranks:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-text-secondary">Loading your ranks...</div>;
  }

  if (!ranks) return null;

  const rankCards = [
    {
      label: "Top Earner",
      rank: ranks.topEarner,
      icon: "💰",
      color: "text-green-400",
    },
    {
      label: "Accuracy",
      rank: ranks.accuracy,
      icon: "🎯",
      color: "text-blue-400",
    },
    {
      label: "Contrarian",
      rank: ranks.contrarian,
      icon: "🦁",
      color: "text-purple-400",
    },
    {
      label: "Trendsetter",
      rank: ranks.trendsetter,
      icon: "💫",
      color: "text-amber-400",
    },
    {
      label: "Weekly Star",
      rank: ranks.weekly,
      icon: "⚡",
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {rankCards.map((card) => (
        <div
          key={card.label}
          className="bg-background rounded-lg p-4 text-center border border-border-color"
        >
          <div className={`text-2xl mb-2 ${card.color}`}>{card.icon}</div>
          <div className="text-sm text-text-secondary mb-1">{card.label}</div>
          <div className={`text-2xl font-bold ${card.color}`}>
            {card.rank ? `#${card.rank}` : "-"}
          </div>
        </div>
      ))}
    </div>
  );
}
