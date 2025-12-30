'use client';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { MarketOutcome } from '@/lib/types/market';

interface BettingDistributionProps {
    outcomes: Array<MarketOutcome & { percentage?: number; total_stake?: number }>;
    isBlindPeriod: boolean;
    userOutcomeId?: string;
}

export function BettingDistribution({
    outcomes,
    isBlindPeriod,
    userOutcomeId,
}: BettingDistributionProps) {
    return (
        <div className="space-y-3">
            {outcomes.map((outcome) => {
                const percentage = outcome.percentage || 0;
                const isUserChoice = outcome.id === userOutcomeId;

                return (
                    <div
                        key={outcome.id}
                        className={`rounded-lg border p-4 transition-colors ${isUserChoice
                            ? 'border-accent-primary bg-accent-primary/10'
                            : 'border-border bg-background-secondary'
                            }`}
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-text-primary">
                                    {outcome.label}
                                </span>
                                {isUserChoice && (
                                    <Badge variant="info" size="sm">
                                        Your Bet
                                    </Badge>
                                )}
                            </div>

                            {!isBlindPeriod && (
                                <span className="font-mono text-lg font-bold text-accent-primary">
                                    {percentage.toFixed(1)}%
                                </span>
                            )}
                        </div>

                        {/* Progress Bar */}
                        {!isBlindPeriod && (
                            <div className="mb-2 h-2 overflow-hidden rounded-full bg-background-primary">
                                <div
                                    className="h-full bg-accent-primary transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        )}

                        {/* Stake Amount */}
                        {!isBlindPeriod && outcome.total_stake !== undefined && (
                            <p className="text-sm text-text-secondary">
                                Total stake: T${outcome.total_stake.toFixed(2)}
                            </p>
                        )}

                        {/* Blind Period Message */}
                        {isBlindPeriod && (
                            <p className="text-sm text-text-secondary">
                                Distribution hidden during blind period
                            </p>
                        )}

                        {/* Value Range (for range bracket markets) */}
                        {outcome.value_min !== null && outcome.value_max !== null && (
                            <p className="mt-1 text-xs text-text-secondary">
                                Range: {outcome.value_min} - {outcome.value_max}
                            </p>
                        )}
                    </div>
                );
            })}

            {isBlindPeriod && (
                <Card variant="bordered" padding="md" className="bg-blind-period/10">
                    <p className="text-center text-sm text-text-secondary">
                        🔒 Betting distribution will be revealed when the blind period ends
                    </p>
                </Card>
            )}
        </div>
    );
}
