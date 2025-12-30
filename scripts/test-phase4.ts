/**
 * Phase 4 Testing Script
 *
 * Runs comprehensive tests for all Phase 4 functionality:
 * - OMDb API integration
 * - Box Office data entry
 * - Auto-resolution
 * - Resolution UI
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { db } from '../lib/db';
import { users, markets, marketOutcomes, bets } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { omdbService } from '../lib/api/omdb';
import { boxOfficeService } from '../lib/api/boxOffice';
import { autoResolveRTMarket, findResolutionCandidates, runAutoResolution } from '../lib/services/autoResolutionService';

// Test results tracker
const results: { test: string; passed: boolean; details?: string }[] = [];

function logTest(name: string, passed: boolean, details?: string) {
  results.push({ test: name, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}`);
  if (details) console.log(`   ${details}`);
}

async function setupTestData() {
  console.log('\n📋 Setting up test data...\n');

  // Create admin user
  const [adminUser] = await db.insert(users).values({
    username: 'testadmin',
    displayName: 'Test Admin',
    isAdmin: true,
    balance: '1000',
  }).returning();

  // Create regular users
  const [alice] = await db.insert(users).values({
    username: 'alice',
    displayName: 'Alice',
    balance: '100',
  }).returning();

  const [bob] = await db.insert(users).values({
    username: 'bob',
    displayName: 'Bob',
    balance: '100',
  }).returning();

  // Create RT Binary Market (ready for resolution)
  const releaseDate = new Date('2024-03-01'); // Dune Part Two
  const [rtMarket] = await db.insert(markets).values({
    title: 'Dune: Part Two',
    description: 'Will Dune: Part Two score above 80% on Rotten Tomatoes?',
    marketType: 'rt_binary',
    category: 'critical_reception',
    releaseDate: releaseDate.toISOString(),
    lockDate: releaseDate.toISOString(),
    status: 'locked',
    imdbId: 'tt15239678',
    threshold: '80',
  }).returning();

  // Create outcomes for RT binary market
  const [yesOutcome] = await db.insert(marketOutcomes).values({
    marketId: rtMarket.id,
    label: 'Yes - Above 80%',
    description: 'The movie will score 80% or higher',
  }).returning();

  const [noOutcome] = await db.insert(marketOutcomes).values({
    marketId: rtMarket.id,
    label: 'No - Below 80%',
    description: 'The movie will score below 80%',
  }).returning();

  // Create bets
  await db.insert(bets).values({
    userId: alice.id,
    marketId: rtMarket.id,
    outcomeId: yesOutcome.id,
    stake: '25',
    isBlindPeriodBet: true,
    isContrarian: true,
    popularityAtBetTime: '0.30',
  });

  await db.insert(bets).values({
    userId: bob.id,
    marketId: rtMarket.id,
    outcomeId: noOutcome.id,
    stake: '20',
    isBlindPeriodBet: false,
    isContrarian: false,
    popularityAtBetTime: '0.70',
  });

  console.log('✅ Test data created\n');

  return {
    adminUser,
    alice,
    bob,
    rtMarket,
    yesOutcome,
    noOutcome,
  };
}

async function testOMDbAPI() {
  console.log('\n🧪 Testing OMDb API Integration\n');

  try {
    // Test 1: Fetch by IMDb ID
    const score1 = await omdbService.getRottenTomatoesScore('tt15239678');
    logTest(
      'Fetch RT score by IMDb ID',
      score1.tomatometer !== null && score1.tomatometer >= 0,
      `Dune Part Two: ${score1.tomatometer}%`
    );

    // Test 2: Fetch by title
    const score2 = await omdbService.getRottenTomatoesScoreByTitle('Barbie', 2023);
    logTest(
      'Fetch RT score by title',
      score2.tomatometer !== null && score2.tomatometer >= 0,
      `Barbie: ${score2.tomatometer}%`
    );

    // Test 3: Validate sufficient reviews
    const hasEnoughReviews = omdbService.validateSufficientReviews(score1, 20);
    logTest(
      'Validate sufficient reviews',
      hasEnoughReviews,
      `${score1.reviewCount} reviews (minimum 20)`
    );

    // Test 4: Cache hit
    const score3 = await omdbService.getRottenTomatoesScore('tt15239678');
    logTest(
      'Caching works',
      score3.retrievedAt.getTime() === score1.retrievedAt.getTime(),
      'Second request returned cached data'
    );

  } catch (error) {
    logTest('OMDb API tests', false, `Error: ${error}`);
  }
}

async function testBoxOfficeService() {
  console.log('\n🧪 Testing Box Office Service\n');

  try {
    // Test 1: Manual data entry
    const boxOfficeData = await boxOfficeService.setManualBoxOfficeData({
      title: 'Dune: Part Two',
      releaseDate: new Date('2024-03-01'),
      openingWeekendGross: 82_500_000,
      rank: 1,
      theaterCount: 4071,
      perTheaterAverage: 20270,
    });

    logTest(
      'Manual box office data entry',
      boxOfficeData.openingWeekendGross === 82_500_000,
      `$${boxOfficeService.formatCurrency(boxOfficeData.openingWeekendGross)}`
    );

    // Test 2: Validate data
    const validation = boxOfficeService.validateBoxOfficeData(boxOfficeData);
    logTest(
      'Box office data validation',
      validation.valid,
      validation.errors.join(', ') || 'All validations passed'
    );

    // Test 3: Determine bracket
    const bracket = boxOfficeService.determineGrossBracket(82_500_000);
    logTest(
      'Bracket determination',
      bracket === '$75M - $100M',
      `$82.5M → ${bracket}`
    );

    // Test 4: Invalid data
    const invalidValidation = boxOfficeService.validateBoxOfficeData({
      title: 'Test',
      openingWeekendGross: -1000,
      rank: 0,
      theaterCount: null,
      perTheaterAverage: null,
      releaseDate: new Date(),
      retrievedAt: new Date(),
    });
    logTest(
      'Rejects invalid data',
      !invalidValidation.valid,
      `Caught ${invalidValidation.errors.length} validation errors`
    );

  } catch (error) {
    logTest('Box Office service tests', false, `Error: ${error}`);
  }
}

async function testAutoResolution(testData: any) {
  console.log('\n🧪 Testing Auto-Resolution\n');

  try {
    // Test 1: Find resolution candidates
    const candidates = await findResolutionCandidates();
    const hasCandidates = candidates.some(c => c.marketId === testData.rtMarket.id);
    logTest(
      'Find resolution candidates',
      hasCandidates,
      `Found ${candidates.length} markets ready for resolution`
    );

    // Test 2: Check days post-release calculation
    const candidate = candidates.find(c => c.marketId === testData.rtMarket.id);
    if (candidate) {
      const daysCorrect = candidate.daysPostRelease >= 14;
      logTest(
        'Days post-release calculation',
        daysCorrect,
        `${candidate.daysPostRelease} days (needs 14+ for RT)`
      );

      logTest(
        'Resolution eligibility',
        candidate.canResolve,
        candidate.reason
      );
    }

    // Test 3: Auto-resolve RT market
    console.log('\n   Attempting to auto-resolve market...');
    const resolutionResult = await autoResolveRTMarket(testData.rtMarket.id);

    logTest(
      'Auto-resolve RT binary market',
      resolutionResult.success,
      resolutionResult.error || `Resolved with actual value: ${resolutionResult.actualValue}%`
    );

    if (resolutionResult.success) {
      // Verify market was resolved
      const resolvedMarket = await db.query.markets.findFirst({
        where: eq(markets.id, testData.rtMarket.id),
      });

      logTest(
        'Market status updated to resolved',
        resolvedMarket?.status === 'resolved',
        `Status: ${resolvedMarket?.status}`
      );

      logTest(
        'Actual value recorded',
        resolvedMarket?.actualValue !== null,
        `RT Score: ${resolvedMarket?.actualValue}%`
      );

      // Check if correct outcome was selected (Dune Part Two should be 92%, so Yes should win)
      const expectedWinner = resolutionResult.actualValue! >= 80 ? testData.yesOutcome.id : testData.noOutcome.id;
      logTest(
        'Correct outcome selected',
        resolvedMarket?.resolvedOutcomeId === expectedWinner,
        `Expected: ${expectedWinner === testData.yesOutcome.id ? 'Yes' : 'No'}`
      );

      // Check user balances updated
      const aliceAfter = await db.query.users.findFirst({
        where: eq(users.id, testData.alice.id),
      });

      const bobAfter = await db.query.users.findFirst({
        where: eq(users.id, testData.bob.id),
      });

      logTest(
        'Winner balance increased',
        Number(aliceAfter?.balance || 0) > Number(testData.alice.balance),
        `Alice: $${testData.alice.balance} → $${aliceAfter?.balance}`
      );

      logTest(
        'Loser balance unchanged',
        Number(bobAfter?.balance || 0) === Number(testData.bob.balance) - 20,
        `Bob: $${testData.bob.balance} → $${bobAfter?.balance} (lost $20 stake)`
      );
    }

  } catch (error) {
    logTest('Auto-resolution tests', false, `Error: ${error}`);
  }
}

async function runAllTests() {
  console.log('🚀 Phase 4 Comprehensive Test Suite\n');
  console.log('====================================\n');

  try {
    // Setup
    const testData = await setupTestData();

    // Run tests
    await testOMDbAPI();
    await testBoxOfficeService();
    await testAutoResolution(testData);

    // Summary
    console.log('\n====================================');
    console.log('📊 Test Summary\n');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log(`Total: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('Failed tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.test}`);
        if (r.details) console.log(`    ${r.details}`);
      });
    }

    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
