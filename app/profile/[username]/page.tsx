'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { TrendsetterScore } from '@/components/features/profile/TrendsetterScore';
import Link from 'next/link';

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  balance: string;
  createdAt: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracyScore: number;
  contrarianScore: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  tasteMatches: Array<{
    user: {
      id: string;
      username: string;
      displayName: string;
      avatar: string | null;
    };
    score: number;
    marketsInCommon: number;
  }>;
  recentBets: Array<{
    id: string;
    marketTitle: string;
    outcomeLabel: string;
    stake: string;
    actualPayout: string | null;
    createdAt: string;
  }>;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (username) {
      loadProfile();
    }
  }, [username]);

  const loadProfile = async () => {
    try {
      // In a real implementation, you'd have a single API endpoint that returns all this data
      // For now, we'll make multiple calls
      const response = await fetch(`/api/users/${username}`);
      if (response.ok) {
        const userData = await response.json();

        // Load additional data
        const [followCounts, tasteMatches, recentBets] = await Promise.all([
          fetch(`/api/users/${userData.id}/follow-counts`).then(r => r.ok ? r.json() : { followers: 0, following: 0 }),
          fetch(`/api/users/${userData.id}/taste-matches`).then(r => r.ok ? r.json() : []),
          fetch(`/api/users/${userData.id}/recent-bets`).then(r => r.ok ? r.json() : []),
        ]);

        // Check if current user is following
        let isFollowing = false;
        if (currentUser && currentUser.id !== userData.id) {
          const followResponse = await fetch(`/api/users/${userData.id}/is-following?userId=${currentUser.id}`);
          if (followResponse.ok) {
            const { isFollowing: following } = await followResponse.json();
            isFollowing = following;
          }
        }

        setProfile({
          ...userData,
          ...followCounts,
          followersCount: followCounts.followers,
          followingCount: followCounts.following,
          isFollowing,
          tasteMatches: tasteMatches.slice(0, 5),
          recentBets: recentBets.slice(0, 10),
          totalPredictions: recentBets.length || 0,
          correctPredictions: recentBets.filter((b: any) => b.actualPayout && parseFloat(b.actualPayout) > 0).length || 0,
          accuracyScore: 0, // Calculate from data
          contrarianScore: 0, // Calculate from data
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) return;

    setFollowLoading(true);
    try {
      const url = `/api/users/${profile.id}/follow`;
      const method = profile.isFollowing ? 'DELETE' : 'POST';

      const response = await fetch(
        profile.isFollowing ? `${url}?userId=${currentUser.id}` : url,
        {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: profile.isFollowing ? undefined : JSON.stringify({ userId: currentUser.id }),
        }
      );

      if (response.ok) {
        setProfile({
          ...profile,
          isFollowing: !profile.isFollowing,
          followersCount: profile.isFollowing ? profile.followersCount - 1 : profile.followersCount + 1,
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Loading />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="elevated" padding="lg">
          <p className="text-center text-text-secondary">User not found</p>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const accountAge = Math.floor(
    (new Date().getTime() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="h-24 w-24 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-4xl font-bold flex-shrink-0">
            {profile.displayName.charAt(0).toUpperCase()}
          </div>

          {/* User Info */}
          <div className="flex-1 space-y-2">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">{profile.displayName}</h1>
              <p className="text-lg text-text-secondary">@{profile.username}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
              <span>Member for {accountAge} days</span>
              <span>•</span>
              <span className="font-mono text-accent-primary">
                Balance: T${parseFloat(profile.balance).toFixed(2)}
              </span>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href={`/profile/${profile.username}/followers`} className="hover:text-accent-primary transition-colors">
                <span className="font-semibold text-text-primary">{profile.followersCount}</span>{' '}
                <span className="text-text-secondary">Followers</span>
              </Link>
              <Link href={`/profile/${profile.username}/following`} className="hover:text-accent-primary transition-colors">
                <span className="font-semibold text-text-primary">{profile.followingCount}</span>{' '}
                <span className="text-text-secondary">Following</span>
              </Link>
            </div>
          </div>

          {/* Follow Button */}
          {!isOwnProfile && currentUser && (
            <Button
              onClick={handleFollowToggle}
              disabled={followLoading}
              variant={profile.isFollowing ? 'outline' : 'primary'}
            >
              {followLoading ? 'Loading...' : profile.isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Trendsetter Score */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Trendsetter Score</h2>
          <TrendsetterScore userId={profile.id} variant="compact" />
        </Card>

        {/* Accuracy */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Prediction Accuracy</h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-text-secondary">Total Predictions</p>
              <p className="text-2xl font-bold text-text-primary">{profile.totalPredictions}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Correct Predictions</p>
              <p className="text-2xl font-bold text-success">{profile.correctPredictions}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Accuracy Rate</p>
              <p className="text-2xl font-bold text-accent-primary">
                {profile.totalPredictions > 0
                  ? `${((profile.correctPredictions / profile.totalPredictions) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </Card>

        {/* Contrarian Score */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Contrarian Score</h2>
          <div className="space-y-2">
            <p className="text-5xl font-bold text-accent-primary">{profile.contrarianScore.toFixed(1)}%</p>
            <p className="text-sm text-text-secondary">
              Percentage of bets against the crowd
            </p>
          </div>
        </Card>
      </div>

      {/* Taste Matches */}
      {profile.tasteMatches.length > 0 && (
        <Card variant="elevated" padding="lg">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Taste Matches</h2>
          <div className="space-y-3">
            {profile.tasteMatches.map((match) => (
              <div key={match.user.id} className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                <Link href={`/profile/${match.user.username}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
                  <div className="h-10 w-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-semibold">
                    {match.user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{match.user.displayName}</p>
                    <p className="text-sm text-text-secondary">@{match.user.username}</p>
                  </div>
                </Link>
                <div className="text-right">
                  <p className="font-semibold text-accent-primary">{(match.score * 100).toFixed(0)}% match</p>
                  <p className="text-xs text-text-secondary">{match.marketsInCommon} markets in common</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Bets */}
      <Card variant="elevated" padding="lg">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Recent Predictions</h2>
        {profile.recentBets.length === 0 ? (
          <p className="text-center text-text-secondary py-8">No predictions yet</p>
        ) : (
          <div className="space-y-3">
            {profile.recentBets.map((bet) => (
              <div key={bet.id} className="p-4 bg-background-secondary rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-text-primary">{bet.marketTitle}</p>
                    <p className="text-sm text-text-secondary">Bet on: {bet.outcomeLabel}</p>
                  </div>
                  {bet.actualPayout && (
                    <Badge variant={parseFloat(bet.actualPayout) > 0 ? 'success' : 'danger'}>
                      {parseFloat(bet.actualPayout) > 0 ? 'Won' : 'Lost'}
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary font-mono">Stake: T${parseFloat(bet.stake).toFixed(2)}</span>
                  {bet.actualPayout && (
                    <span className={`font-mono ${parseFloat(bet.actualPayout) > 0 ? 'text-success' : 'text-danger'}`}>
                      Payout: T${parseFloat(bet.actualPayout).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
