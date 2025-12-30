"use client";

import Link from "next/link";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  score: number;
  badge?: string;
  [key: string]: any; // Allow additional properties
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  scoreLabel: string;
  scoreFormatter?: (score: number) => string;
  additionalColumns?: {
    label: string;
    key: string;
    formatter?: (value: any) => string;
  }[];
}

export default function LeaderboardTable({
  entries,
  currentUserId,
  scoreLabel,
  scoreFormatter = (score) => score.toFixed(2),
  additionalColumns = [],
}: LeaderboardTableProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-amber-600";
    return "text-text-secondary";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "👑";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-color">
            <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">
              Rank
            </th>
            <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">
              User
            </th>
            <th className="text-right py-3 px-4 text-text-secondary text-sm font-medium">
              {scoreLabel}
            </th>
            {additionalColumns.map((col) => (
              <th
                key={col.key}
                className="text-right py-3 px-4 text-text-secondary text-sm font-medium"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            return (
              <tr
                key={entry.userId}
                className={`border-b border-border-color hover:bg-background-elevated transition-colors ${
                  isCurrentUser ? "bg-accent/10" : ""
                }`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${getRankColor(entry.rank)}`}>
                      {getRankIcon(entry.rank)}
                    </span>
                    <span className={`text-lg font-bold ${getRankColor(entry.rank)}`}>
                      #{entry.rank}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Link
                    href={`/profile/${entry.username}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    {entry.avatar ? (
                      <img
                        src={entry.avatar}
                        alt={entry.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                        {entry.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-white">
                        {entry.displayName || entry.username}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-accent">(You)</span>
                        )}
                      </div>
                      <div className="text-sm text-text-secondary">
                        @{entry.username}
                      </div>
                      {entry.badge && (
                        <div className="text-xs text-accent mt-1">{entry.badge}</div>
                      )}
                    </div>
                  </Link>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-lg font-bold font-mono text-white">
                    {scoreFormatter(entry.score)}
                  </span>
                </td>
                {additionalColumns.map((col) => (
                  <td key={col.key} className="py-4 px-4 text-right">
                    <span className="text-sm text-text-secondary font-mono">
                      {col.formatter
                        ? col.formatter(entry[col.key])
                        : entry[col.key]}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
