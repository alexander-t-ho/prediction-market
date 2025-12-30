// Clear all markets from the database
// This will delete all markets, outcomes, and bets

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function clearMarkets() {
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('🗑️  Clearing all markets from database...\n');

    // Delete in order to respect foreign key constraints
    await client`DELETE FROM bets`;
    console.log('✅ Deleted all bets');

    await client`DELETE FROM market_outcomes`;
    console.log('✅ Deleted all market outcomes');

    await client`DELETE FROM markets`;
    console.log('✅ Deleted all markets');

    console.log('\n✨ Database cleared successfully!');
    console.log('💡 Run "npm run seed:markets" to generate new markets with top 15 movies\n');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing markets:', error);
    await client.end();
    process.exit(1);
  }
}

clearMarkets();
