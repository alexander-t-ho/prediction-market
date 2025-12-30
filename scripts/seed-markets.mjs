// Seed Markets Script
// Run this to generate initial markets for testing
// This calls the API endpoint to generate markets

async function seedMarkets() {
    try {
        console.log('🌱 Starting market seeding...\n');
        console.log('📡 Calling market generation API...\n');

        const response = await fetch('http://localhost:3000/api/cron/generate-markets');

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }

        const result = await response.json();

        console.log('\n✅ Market seeding complete!');
        console.log(`📊 Movies processed: ${result.movies_processed}`);
        console.log(`📊 Markets created: ${result.markets_created}`);
        console.log(`🔄 Markets transitioned to open: ${result.markets_transitioned_to_open}`);
        console.log(`🔒 Markets locked: ${result.markets_locked}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding markets:', error.message);
        console.error('\n💡 Make sure the dev server is running (npm run dev)');
        process.exit(1);
    }
}

seedMarkets();
