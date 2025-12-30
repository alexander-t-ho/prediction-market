"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import LeaderboardTable, {
  LeaderboardEntry,
} from "@/components/features/leaderboards/LeaderboardTable";
import Link from "next/link";

export default function TopEarnersPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const url = user
        ? `/api/leaderboards/top_earners?limit=100&userId=${user.id}`
        : "/api/leaderboards/top_earners?limit=100";

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch leaderboard");

      const data = await response.json();
      setLeaderboard(data.leaderboard);
      if (data.userRank) setUserRank(data.userRank);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError("Failed to load leaderboard. Please try again.");
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
            <p className="text-text-secondary">Loading leaderboard...</p>
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
            onClick={fetchLeaderboard}
            className="mt-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/leaderboards"
          className="text-accent hover:underline mb-4 inline-block"
        >
          ← Back to All Leaderboards
        </Link>
        <h1 className="text-4xl font-bold text-green-400 flex items-center gap-3 mb-2">
          <span>💰</span>
          Top Earners
        </h1>
        <p className="text-text-secondary text-lg">
          The richest predictors with the highest balances
        </p>
      </div>

      {/* User Rank Card */}
      {user && userRank && (
        <div className="mb-6 bg-accent/10 border border-accent/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">Your Rank</p>
              <p className="text-2xl font-bold text-accent">#{userRank}</p>
            </div>
            <div className="text-right">
              <p className="text-text-secondary text-sm">Keep climbing!</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-background-elevated rounded-lg border border-border-color overflow-hidden">
        <LeaderboardTable
          entries={leaderboard}
          currentUserId={user?.id}
          scoreLabel="Balance"
          scoreFormatter={(score) => `T$${score.toLocaleString()}`}
          additionalColumns={[
            {
              label: "Total Profits",
              key: "totalProfits",
              formatter: (value) => {
                const num = Number(value);
                const prefix = num >= 0 ? "+" : "";
                return `${prefix}T$${num.toLocaleString()}`;
              },
            },
          ]}
        />
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-background-elevated rounded-lg p-6 border border-border-color">
        <h2 className="text-xl font-bold text-white mb-4">
          How Top Earner Rankings Work
        </h2>
        <div className="space-y-2 text-text-secondary">
          <p>
            • Rankings are based on your current account balance
          </p>
          <p>
            • Total profits show your cumulative earnings from all predictions
          </p>
          <p>
            • Earn badges for reaching balance milestones
          </p>
          <p>
            • Updated in real-time with 15-minute cache
          </p>
        </div>
      </div>
    </div>
  );
}
