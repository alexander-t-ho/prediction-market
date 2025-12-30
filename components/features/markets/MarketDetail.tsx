'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BlindPeriodIndicator } from '@/components/ui/BlindPeriodIndicator';
import { BetForm } from './BetForm';
import { BettingDistribution } from './BettingDistribution';
import { CommentsSection } from './CommentsSection';
import type { MarketWithStats } from '@/lib/types/market';

interface MarketDetailProps {
    market: MarketWithStats;
    onBetPlaced?: () => void;
}

export function MarketDetail({ market, onBetPlaced }: MarketDetailProps) {
    const [activeTab, setActiveTab] = useState<'bet' | 'activity' | 'comments'>('bet');
    const { user } = useAuth();

    const isBlindPeriod = market.status === 'blind';
    const canBet = market.status === 'blind' || market.status === 'open';
    const hasUserBet = !!market.user_bet;

    // Format dates
    const releaseDate = new Date(market.release_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const lockDate = new Date(market.closes_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    // Get status badge
    const getStatusBadge = () => {
        switch (market.status) {
            case 'blind':
                return <BlindPeriodIndicator endsAt={new Date(market.blind_period_ends_at)} />;
            case 'open':
                return <Badge variant="success">Open</Badge>;
            case 'locked':
                return <Badge variant="warning">Locked</Badge>;
            case 'resolved':
                return <Badge variant="info">Resolved</Badge>;
            default:
                return null;
        }
    };

    // Get category badge
    const getCategoryBadge = () => {
        if (market.category === 'rotten_tomatoes') {
            return <Badge variant="danger">🍅 Rotten Tomatoes</Badge>;
        }
        return <Badge variant="success">💰 Box Office</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card variant="elevated" padding="lg">
                <div className="grid gap-6 md:grid-cols-[300px_1fr]">
                    {/* Movie Poster */}
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-background-secondary">
                        {market.movie_poster_path ? (
                            <Image
                                src={`https://image.tmdb.org/t/p/w342${market.movie_poster_path}`}
                                alt={market.movie_title}
                                fill
                                className="object-cover"
                                sizes="300px"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-text-secondary">
                                No poster available
                            </div>
                        )}
                    </div>

                    {/* Market Info */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {getStatusBadge()}
                            {getCategoryBadge()}
                        </div>

                        <div>
                            <h1 className="mb-2 text-3xl font-bold text-text-primary">
                                {market.title}
                            </h1>
                            <p className="text-lg text-text-secondary">{market.movie_title}</p>
                        </div>

                        {market.description && (
                            <p className="text-text-secondary">{market.description}</p>
                        )}

                        {/* Market Details */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-sm text-text-secondary">Release Date</p>
                                <p className="font-semibold text-text-primary">{releaseDate}</p>
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Market Closes</p>
                                <p className="font-semibold text-text-primary">{lockDate}</p>
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Total Pool</p>
                                <p className="font-mono text-lg font-semibold text-accent-primary">
                                    T${market.total_pool.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Total Bets</p>
                                <p className="font-semibold text-text-primary">{market.total_bets}</p>
                            </div>
                        </div>

                        {/* User's Bet */}
                        {hasUserBet && market.user_bet && (
                            <Card variant="bordered" padding="md" className="bg-accent-primary/10">
                                <p className="mb-1 text-sm text-text-secondary">Your Position</p>
                                <p className="text-lg font-semibold text-text-primary">
                                    {market.user_bet.outcome_label}
                                </p>
                                <p className="font-mono text-accent-primary">
                                    Stake: T${market.user_bet.stake.toFixed(2)}
                                </p>
                            </Card>
                        )}
                    </div>
                </div>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
                <button
                    onClick={() => setActiveTab('bet')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'bet'
                        ? 'border-b-2 border-accent-primary text-accent-primary'
                        : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    {hasUserBet ? 'Your Bet' : 'Place Bet'}
                </button>
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'activity'
                        ? 'border-b-2 border-accent-primary text-accent-primary'
                        : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Activity
                </button>
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'comments'
                        ? 'border-b-2 border-accent-primary text-accent-primary'
                        : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Comments
                </button>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'bet' && (
                    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                        {/* Betting Distribution */}
                        <Card variant="elevated" padding="lg">
                            <h2 className="mb-4 text-xl font-semibold text-text-primary">
                                {isBlindPeriod ? 'Outcomes' : 'Betting Distribution'}
                            </h2>
                            <BettingDistribution
                                outcomes={market.outcomes}
                                isBlindPeriod={isBlindPeriod}
                                userOutcomeId={market.user_bet?.outcome_id}
                            />
                        </Card>

                        {/* Bet Form */}
                        {canBet && !hasUserBet && (
                            <Card variant="elevated" padding="lg">
                                <h2 className="mb-4 text-xl font-semibold text-text-primary">
                                    Place Your Bet
                                </h2>
                                <BetForm
                                    market={market}
                                    userId={user?.id || ''}
                                    userBalance={parseFloat(user?.balance || '0')}
                                    onBetPlaced={onBetPlaced || (() => { })}
                                />
                            </Card>
                        )}

                        {!canBet && !hasUserBet && (
                            <Card variant="bordered" padding="lg">
                                <p className="text-center text-text-secondary">
                                    {market.status === 'locked'
                                        ? 'This market is locked. No more bets can be placed.'
                                        : 'This market has been resolved.'}
                                </p>
                            </Card>
                        )}
                    </div>
                )}

                {activeTab === 'activity' && (
                    <Card variant="elevated" padding="lg">
                        <h2 className="mb-4 text-xl font-semibold text-text-primary">
                            Recent Activity
                        </h2>
                        <p className="text-center text-text-secondary">
                            {isBlindPeriod
                                ? 'Activity will be visible after the blind period ends'
                                : 'No recent activity'}
                        </p>
                    </Card>
                )}

                {activeTab === 'comments' && (
                    <CommentsSection marketId={market.id} />
                )}
            </div>
        </div>
    );
}
