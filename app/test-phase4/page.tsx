'use client';

import { useState } from 'react';
import { ResolutionCard } from '@/components/features/markets/ResolutionCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function TestPhase4Page() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTest = async (name: string, fn: () => Promise<any>) => {
    try {
      const result = await fn();
      setTestResults(prev => [...prev, { name, success: true, result }]);
      return result;
    } catch (error) {
      setTestResults(prev => [...prev, {
        name,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }]);
      throw error;
    }
  };

  const testOMDbAPI = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Test 1: Fetch by IMDb ID
      await runTest('Fetch RT score by IMDb ID (Dune Part Two)', async () => {
        const res = await fetch('/api/admin/rt-score?imdbId=tt15239678');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data;
      });

      // Test 2: Fetch by title
      await runTest('Fetch RT score by title (Barbie)', async () => {
        const res = await fetch('/api/admin/rt-score?title=Barbie&year=2023');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data;
      });

      // Test 3: Caching (same as test 1)
      await runTest('Test caching (re-fetch Dune)', async () => {
        const res = await fetch('/api/admin/rt-score?imdbId=tt15239678');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data;
      });

    } finally {
      setLoading(false);
    }
  };

  const testAutoResolution = async () => {
    setLoading(true);

    try {
      await runTest('Run auto-resolution cron job', async () => {
        const res = await fetch('/api/cron/auto-resolve', { method: 'POST' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data;
      });
    } finally {
      setLoading(false);
    }
  };

  const passed = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.success).length;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">Phase 4 Test Suite</h1>
        <p className="text-gray-400 mb-8">Testing Resolution and Payouts functionality</p>

        {/* Test Controls */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">Run Tests</h2>
          <div className="flex gap-4">
            <Button onClick={testOMDbAPI} disabled={loading}>
              Test OMDb API
            </Button>
            <Button onClick={testAutoResolution} disabled={loading} variant="secondary">
              Test Auto-Resolution
            </Button>
          </div>
        </Card>

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Test Results</h2>

            <div className="mb-4 flex gap-4">
              <div className="px-4 py-2 bg-green-900/20 border border-green-700 rounded-lg">
                <span className="text-green-400 font-semibold">✅ Passed: {passed}</span>
              </div>
              <div className="px-4 py-2 bg-red-900/20 border border-red-700 rounded-lg">
                <span className="text-red-400 font-semibold">❌ Failed: {failed}</span>
              </div>
            </div>

            <div className="space-y-3">
              {testResults.map((result, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    result.success
                      ? 'bg-green-900/10 border-green-700'
                      : 'bg-red-900/10 border-red-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{result.name}</span>
                    <span className={result.success ? 'text-green-400' : 'text-red-400'}>
                      {result.success ? '✅' : '❌'}
                    </span>
                  </div>
                  {result.success && result.result && (
                    <pre className="text-xs text-gray-400 overflow-auto">
                      {JSON.stringify(result.result, null, 2).substring(0, 500)}
                    </pre>
                  )}
                  {!result.success && (
                    <p className="text-sm text-red-400">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* UI Component Tests */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-white">UI Component Tests</h2>

          {/* Test 1: Winning Resolution Card */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Resolution Card - Winning Bet with Contrarian Bonus
            </h3>
            <ResolutionCard
              marketTitle="Dune: Part Two"
              marketType="rt_binary"
              winningOutcome="Yes - Above 80%"
              actualValue={92}
              userBet={{
                outcome: "Yes",
                stake: 25,
                won: true,
                basePayout: 50,
                dynamicMultiplier: 1.09,
                contrarianBonus: 1.25,
                finalPayout: 68.13,
                wasBlindPeriodBet: true,
                wasContrarian: true,
              }}
              tasteMatches={12}
              trendsetterPointsEarned={7}
              resolvedAt={new Date()}
            />
          </div>

          {/* Test 2: Losing Resolution Card */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Resolution Card - Losing Bet
            </h3>
            <ResolutionCard
              marketTitle="Test Movie"
              marketType="rt_binary"
              winningOutcome="No - Below 70%"
              actualValue={45}
              userBet={{
                outcome: "Yes",
                stake: 20,
                won: false,
                basePayout: 0,
                dynamicMultiplier: 1.0,
                contrarianBonus: 1.0,
                finalPayout: 0,
                wasBlindPeriodBet: false,
                wasContrarian: false,
              }}
              resolvedAt={new Date()}
            />
          </div>

          {/* Test 3: Box Office Market */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">
              Resolution Card - Box Office Market
            </h3>
            <ResolutionCard
              marketTitle="Will Dune: Part Two open above $75M?"
              marketType="box_office_binary"
              winningOutcome="Yes - Above $75M"
              actualValue={82500000}
              userBet={{
                outcome: "Yes",
                stake: 30,
                won: true,
                basePayout: 45,
                dynamicMultiplier: 1.15,
                contrarianBonus: 1.0,
                finalPayout: 51.75,
                wasBlindPeriodBet: false,
                wasContrarian: false,
              }}
              trendsetterPointsEarned={2}
              resolvedAt={new Date()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
