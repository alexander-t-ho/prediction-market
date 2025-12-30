"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface PendingMarket {
  id: string;
  title: string;
  description: string;
  movieTitle: string;
  category: string;
  threshold: string | null;
  createdAt: string;
  proposer: {
    username: string;
    displayName: string;
  };
  outcomes: Array<{
    id: string;
    description: string;
  }>;
}

export default function PendingMarketsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [markets, setMarkets] = useState<PendingMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push("/");
      return;
    }

    if (user && user.isAdmin) {
      fetchPendingMarkets();
    }
  }, [user, authLoading, router]);

  const fetchPendingMarkets = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/markets/pending", {
        headers: {
          "x-user-id": user!.id,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch pending markets");

      const data = await response.json();
      setMarkets(data.markets);
    } catch (err) {
      console.error("Error fetching pending markets:", err);
      setError("Failed to load pending markets");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    marketId: string,
    action: "approve" | "reject",
    notes?: string
  ) => {
    try {
      setProcessingId(marketId);

      const body: any = { marketId, action };

      if (action === "reject") {
        const reason = prompt("Please provide a reason for rejection:");
        if (!reason) {
          setProcessingId(null);
          return;
        }
        body.reason = reason;
      } else if (notes) {
        body.notes = notes;
      }

      const response = await fetch("/api/admin/markets/pending", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user!.id,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(`Failed to ${action} market`);

      // Remove from list
      setMarkets(markets.filter((m) => m.id !== marketId));
    } catch (err) {
      console.error(`Error ${action}ing market:`, err);
      alert(`Failed to ${action} market. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p className="text-text-secondary">Loading pending markets...</p>
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
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <a
          href="/admin"
          className="text-accent hover:underline mb-4 inline-block"
        >
          ← Back to Admin Dashboard
        </a>
        <h1 className="text-4xl font-bold text-white mb-2">
          📝 Pending Markets
        </h1>
        <p className="text-text-secondary text-lg">
          Review and approve user-proposed markets
        </p>
      </div>

      {/* Markets List */}
      {markets.length === 0 ? (
        <div className="bg-background-elevated rounded-lg p-12 text-center border border-border-color">
          <p className="text-text-secondary text-lg">
            No pending markets to review
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {markets.map((market) => (
            <div
              key={market.id}
              className="bg-background-elevated rounded-lg p-6 border border-border-color"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {market.title}
                  </h3>
                  <p className="text-text-secondary mb-2">
                    {market.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span>
                      🎬 {market.movieTitle}
                    </span>
                    <span>
                      📁 {market.category}
                    </span>
                    <span>
                      👤 Proposed by @{market.proposer.username}
                    </span>
                    <span>
                      📅 {new Date(market.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {market.threshold && (
                <div className="mb-4 p-3 bg-background rounded-lg">
                  <span className="text-text-secondary text-sm">
                    Threshold:{" "}
                  </span>
                  <span className="text-white font-bold">
                    {market.threshold}
                  </span>
                </div>
              )}

              {/* Outcomes */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-text-secondary mb-2">
                  Outcomes:
                </h4>
                <div className="flex gap-2">
                  {market.outcomes.map((outcome) => (
                    <div
                      key={outcome.id}
                      className="px-4 py-2 bg-background rounded-lg text-white text-sm"
                    >
                      {outcome.description}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleAction(market.id, "approve")}
                  disabled={processingId === market.id}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === market.id ? "Processing..." : "✓ Approve"}
                </button>
                <button
                  onClick={() => handleAction(market.id, "reject")}
                  disabled={processingId === market.id}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === market.id ? "Processing..." : "✗ Reject"}
                </button>
                <a
                  href={`/markets/${market.id}`}
                  className="px-6 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Details →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
