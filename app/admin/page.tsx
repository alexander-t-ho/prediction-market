"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalMarkets: number;
  activeMarkets: number;
  resolvedMarkets: number;
  totalBets: number;
  totalPoolValue: number;
  totalPlatformValue: number;
}

interface RecentResolution {
  id: string;
  marketId: string;
  marketTitle: string;
  resolvedAt: string;
  totalPayout: number;
  winnersCount: number;
  actualValue: number | null;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentResolutions, setRecentResolutions] = useState<RecentResolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/");
      return;
    }

    if (user && !user.isAdmin) {
      router.push("/");
      return;
    }

    if (user && user.isAdmin) {
      fetchAdminData();
    }
  }, [user, authLoading, router]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/stats", {
        headers: {
          "x-user-id": user!.id,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch admin data");

      const data = await response.json();
      setStats(data.statistics);
      setRecentResolutions(data.recentResolutions);
    } catch (err) {
      console.error("Error fetching admin data:", err);
      setError("Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
            <p className="text-text-secondary">Loading admin dashboard...</p>
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
        <h1 className="text-4xl font-bold text-white mb-2">
          🛠️ Admin Dashboard
        </h1>
        <p className="text-text-secondary text-lg">
          Platform management and statistics
        </p>
      </div>

      {/* Platform Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            subtitle={`${stats.activeUsers.toLocaleString()} active`}
            icon="👥"
            color="text-blue-400"
          />
          <StatCard
            title="Total Markets"
            value={stats.totalMarkets.toLocaleString()}
            subtitle={`${stats.activeMarkets} active, ${stats.resolvedMarkets} resolved`}
            icon="📊"
            color="text-green-400"
          />
          <StatCard
            title="Total Bets"
            value={stats.totalBets.toLocaleString()}
            subtitle="All-time predictions"
            icon="🎯"
            color="text-purple-400"
          />
          <StatCard
            title="Active Pool Value"
            value={`T$${stats.totalPoolValue.toLocaleString()}`}
            subtitle={`T$${stats.totalPlatformValue.toLocaleString()} total`}
            icon="💰"
            color="text-yellow-400"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ActionCard
          title="Pending Markets"
          description="Review and approve user-proposed markets"
          icon="📝"
          href="/admin/markets/pending"
          color="bg-blue-500/10 border-blue-500/50 hover:border-blue-500"
        />
        <ActionCard
          title="Market Management"
          description="Edit, resolve, or cancel markets"
          icon="⚙️"
          href="/admin/markets"
          color="bg-green-500/10 border-green-500/50 hover:border-green-500"
        />
        <ActionCard
          title="User Management"
          description="Manage user accounts and permissions"
          icon="👤"
          href="/admin/users"
          color="bg-purple-500/10 border-purple-500/50 hover:border-purple-500"
        />
      </div>

      {/* Recent Resolutions */}
      {recentResolutions.length > 0 && (
        <div className="bg-background-elevated rounded-lg p-6 border border-border-color">
          <h2 className="text-2xl font-bold text-white mb-4">
            Recent Resolutions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-color">
                  <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                    Market
                  </th>
                  <th className="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                    Winners
                  </th>
                  <th className="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                    Total Payout
                  </th>
                  <th className="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                    Resolved At
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentResolutions.map((resolution) => (
                  <tr
                    key={resolution.id}
                    className="border-b border-border-color hover:bg-background-hover transition-colors"
                  >
                    <td className="py-4 px-4">
                      <a
                        href={`/markets/${resolution.marketId}`}
                        className="text-accent hover:underline"
                      >
                        {resolution.marketTitle}
                      </a>
                    </td>
                    <td className="py-4 px-4 text-right text-white">
                      {resolution.winnersCount}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-green-400">
                      T${resolution.totalPayout.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-text-secondary">
                      {new Date(resolution.resolvedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-background-elevated rounded-lg p-6 border border-border-color">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-secondary text-sm font-medium">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-text-secondary text-sm">{subtitle}</div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className={`block p-6 rounded-lg border transition-all ${color}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      <p className="text-text-secondary">{description}</p>
    </a>
  );
}
