"use client";

import Link from "next/link";
import { LeaderboardEntry } from "./LeaderboardTable";

interface LeaderboardCardProps {
  title: string;
  description: string;
  icon: string;
  entries: LeaderboardEntry[];
  href: string;
  scoreLabel: string;
  scoreFormatter?: (score: number) => string;
  accentColor?: string;
}

export default function LeaderboardCard({
  title,
  description,
  icon,
  entries,
  href,
  scoreLabel,
  scoreFormatter = (score) => score.toFixed(2),
  accentColor = "text-accent",
}: LeaderboardCardProps) {
  return (
    <div className="bg-background-elevated rounded-lg p-6 border border-border-color hover:border-accent/50 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-xl font-bold ${accentColor} flex items-center gap-2`}>
            <span>{icon}</span>
            {title}
          </h3>
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {entries.slice(0, 5).map((entry) => (
          <Link
            key={entry.userId}
            href={`/profile/${entry.username}`}
            className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-background-hover transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-text-secondary w-8">
                #{entry.rank}
              </span>
              {entry.avatar ? (
                <img
                  src={entry.avatar}
                  alt={entry.username}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                  {entry.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-semibold text-white text-sm">
                  {entry.displayName || entry.username}
                </div>
                {entry.badge && (
                  <div className="text-xs text-accent">{entry.badge}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold font-mono text-white">
                {scoreFormatter(entry.score)}
              </div>
              <div className="text-xs text-text-secondary">{scoreLabel}</div>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href={href}
        className="block w-full text-center py-2 px-4 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium"
      >
        View Full Leaderboard →
      </Link>
    </div>
  );
}
