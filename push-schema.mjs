import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

// Read and execute the schema from lib/db/schema.ts
// For simplicity, we'll create the tables manually based on the schema

const schemas = [
  `CREATE TYPE IF NOT EXISTS "public"."challenge_status" AS ENUM('pending', 'accepted', 'expired', 'resolved')`,
  `CREATE TYPE IF NOT EXISTS "public"."market_status" AS ENUM('pending', 'blind', 'open', 'locked', 'resolving', 'resolved', 'cancelled')`,
  `CREATE TYPE IF NOT EXISTS "public"."market_type" AS ENUM('binary', 'range_bracket')`,
  `CREATE TYPE IF NOT EXISTS "public"."notification_type" AS ENUM('blind_period_ending', 'market_locked', 'market_resolved', 'payout_received', 'contrarian_bonus', 'taste_match', 'new_follower', 'challenge_received', 'challenge_accepted')`,
  `CREATE TYPE IF NOT EXISTS "public"."prediction_category" AS ENUM('rotten_tomatoes', 'box_office', 'box_office_ranking')`,
];

try {
  console.log('Creating enum types...');
  for (const schema of schemas) {
    try {
      await sql.unsafe(schema);
    } catch (e) {
      if (e.code !== '42710') throw e; // Ignore "already exists" errors
    }
  }

  console.log('✅ Enum types created');
  console.log('📋 Now run: npm run db:push');
  console.log('   Then select "Yes, I want to execute all statements"');

  await sql.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  await sql.end();
  process.exit(1);
}
