'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ContrarianBadge } from '@/components/ui/ContrarianBadge';
import type { MarketWithStats } from '@/lib/types/market';
import { BET_CONSTRAINTS } from '@/lib/types/bet';

interface BetFormProps {
  market: MarketWithStats;
  userId: string;
  userBalance: number;
  onBetPlaced: () => void;
}

export function BetForm({ market, userId, userBalance, onBetPlaced }: BetFormProps) {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('');
  const [stake, setStake] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isBlindPeriod = market.status === 'blind';
  const selectedOutcome = market.outcomes.find((o) => o.id === selectedOutcomeId);

  // Validate stake
  const validateStake = (value: string): string | null => {
    const num = parseFloat(value);

    if (isNaN(num)) {
      return 'Please enter a valid amount';
    }

    if (num < BET_CONSTRAINTS.MIN_STAKE) {
      return `Minimum stake is T$${BET_CONSTRAINTS.MIN_STAKE}`;
    }

    if (num > BET_CONSTRAINTS.MAX_STAKE) {
      return `Maximum stake is T$${BET_CONSTRAINTS.MAX_STAKE}`;
    }

    if (num > userBalance) {
      return `Insufficient balance. You have T$${userBalance.toFixed(2)}`;
    }

    return null;
  };

  const handleStakeChange = (value: string) => {
    setStake(value);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOutcomeId) {
      setError('Please select an outcome');
      return;
    }

    const validationError = validateStake(stake);
    if (validationError) {
      setError(validationError);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmBet = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          market_id: market.id,
          outcome_id: selectedOutcomeId,
          stake: parseFloat(stake),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to place bet');
      }

      setShowConfirmModal(false);
      onBetPlaced();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if outcome would be contrarian
  const isOutcomeContrarian = (outcomeId: string): boolean => {
    if (isBlindPeriod || market.total_pool === 0) return false;
    const outcome = market.outcomes.find((o) => o.id === outcomeId);
    return outcome ? outcome.percentage < 30 : false;
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Outcome Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Select Outcome
          </label>
          <div className="space-y-2">
            {market.outcomes.map((outcome) => (
              <button
                key={outcome.id}
                type="button"
                onClick={() => setSelectedOutcomeId(outcome.id)}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedOutcomeId === outcome.id
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border hover:border-accent-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedOutcomeId === outcome.id
                          ? 'border-accent-primary'
                          : 'border-text-secondary'
                      }`}
                    >
                      {selectedOutcomeId === outcome.id && (
                        <div className="w-3 h-3 rounded-full bg-accent-primary" />
                      )}
                    </div>
                    <div>
                      <span className="text-text-primary font-medium">
                        {outcome.label}
                      </span>
                      {!isBlindPeriod && (
                        <span className="text-sm text-text-secondary ml-2">
                          {outcome.percentage.toFixed(1)}% of pool
                        </span>
                      )}
                    </div>
                  </div>
                  {isOutcomeContrarian(outcome.id) && <ContrarianBadge />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stake Input */}
        <Input
          label="Stake Amount"
          type="number"
          value={stake}
          onChange={(e) => handleStakeChange(e.target.value)}
          placeholder="Enter amount"
          helperText={`Min: T$${BET_CONSTRAINTS.MIN_STAKE} | Max: T$${Math.min(BET_CONSTRAINTS.MAX_STAKE, userBalance).toFixed(2)}`}
          error={error}
          min={BET_CONSTRAINTS.MIN_STAKE}
          max={userBalance >= BET_CONSTRAINTS.MIN_STAKE ? Math.min(BET_CONSTRAINTS.MAX_STAKE, userBalance) : undefined}
          step="0.01"
          disabled={userBalance < BET_CONSTRAINTS.MIN_STAKE}
        />

        {/* Balance Display */}
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Your Balance</span>
          <span className="text-text-primary font-medium">
            T${userBalance.toFixed(2)}
          </span>
        </div>

        {/* Insufficient Balance Warning */}
        {userBalance < BET_CONSTRAINTS.MIN_STAKE && (
          <div className="bg-negative/10 border border-negative rounded-lg p-4">
            <p className="text-sm text-negative font-medium">
              Insufficient balance to place a bet
            </p>
            <p className="text-sm text-text-secondary mt-1">
              You need at least T${BET_CONSTRAINTS.MIN_STAKE.toFixed(2)} to place a bet. Your current balance is T${userBalance.toFixed(2)}.
            </p>
          </div>
        )}

        {/* Blind Period Message */}
        {isBlindPeriod && (
          <div className="bg-blind-period/10 border border-blind-period rounded-lg p-4">
            <p className="text-sm text-text-primary">
              This market is in blind period. Odds will be revealed when the blind
              period ends.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selectedOutcomeId || !stake || isSubmitting}
        >
          Place Bet
        </Button>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedOutcome && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Bet"
        >
          <div className="space-y-4">
            <div className="bg-background-secondary rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Market</span>
                <span className="text-text-primary font-medium text-right max-w-xs">
                  {market.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Outcome</span>
                <span className="text-text-primary font-medium">
                  {selectedOutcome.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Stake</span>
                <span className="text-text-primary font-medium">
                  T${parseFloat(stake).toFixed(2)}
                </span>
              </div>
              {!isBlindPeriod && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Current Share</span>
                  <span className="text-text-primary font-medium">
                    {selectedOutcome.percentage.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm text-text-secondary">
              Once placed, bets cannot be modified or cancelled. Make sure you're
              confident in your prediction!
            </p>

            {error && (
              <div className="bg-negative/10 border border-negative rounded p-3">
                <p className="text-sm text-negative">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={handleConfirmBet}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Placing...' : 'Confirm Bet'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
