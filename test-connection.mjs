import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

try {
  const result = await sql`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('✅ Connected successfully!');
  console.log('Public tables count:', result[0].count);

  // Check for markets table
  const markets = await sql`SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'markets'`;
  console.log('Markets table exists:', markets[0].count > 0);

  await sql.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}
