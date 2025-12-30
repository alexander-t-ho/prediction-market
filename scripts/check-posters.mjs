import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env.local');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL);

const markets = await client`SELECT id, title, movie_title, movie_poster_path FROM markets ORDER BY created_at DESC LIMIT 5`;

console.log('\nMarkets in database:\n');
markets.forEach((m, i) => {
  console.log(`${i+1}. ${m.movie_title}`);
  console.log(`   Poster path: ${m.movie_poster_path || 'NULL'}`);
  if (m.movie_poster_path) {
    console.log(`   Full URL: https://image.tmdb.org/t/p/w342${m.movie_poster_path}`);
  }
  console.log('');
});

await client.end();
