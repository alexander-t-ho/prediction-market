# HotTake - Movie Prediction Market

**Put your opinions to the test.**

HotTake is a prediction market platform focused on movie releases, featuring an innovative Authentic Opinion Incentive System that rewards genuine predictions over bandwagoning.

## Features

- 🎬 **Movie Predictions**: Predict Rotten Tomatoes scores and box office performance
- 👁️ **Blind Betting Period**: First 48 hours hide odds to capture authentic opinions
- 💜 **Contrarian Bonuses**: 1.25x multiplier for winning minority positions
- 📊 **Dynamic Odds**: Payout rates adjust based on position popularity
- 🎯 **Taste Matching**: Discover users with similar prediction patterns
- 🏆 **Trendsetter Scores**: Earn reputation for early, correct contrarian bets

## Technology Stack

- **Frontend**: Next.js 14+ (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with custom Kalshi-inspired dark theme
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle ORM
- **Authentication**: Username-based (PoC) → Supabase Auth (future)
- **External APIs**: TMDB, OMDb, Box Office Mojo

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- API keys for TMDB and OMDb

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prediction-market-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

   Required variables:
   - `DATABASE_URL`: PostgreSQL connection string from Supabase
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
   - `TMDB_API_KEY`: API key from themoviedb.org
   - `OMDB_API_KEY`: API key from omdbapi.com (for Rotten Tomatoes scores)
   - `RAPIDAPI_KEY`: Optional - RapidAPI key for box office data
   - `CRON_SECRET`: Random secret string for cron job authentication

4. **Set up the database**

   Generate and run migrations:
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Database
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

### Testing
- `npm run test` - Run all unit and integration tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI
- `npm run test:e2e:headed` - Run E2E tests in headed mode (visible browser)
- `npm run test:integration` - Run integration tests only
- `npm run test:all` - Run all tests (unit + integration + E2E)
- `npm run playwright:install` - Install Playwright browsers

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── markets/           # Market pages
│   ├── profile/           # User profile pages
│   ├── leaderboards/      # Leaderboard pages
│   └── admin/             # Admin dashboard
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── markets/          # Market-specific components
│   └── user/             # User-related components
├── lib/                   # Shared utilities
│   ├── db/               # Database configuration and schema
│   ├── services/         # Business logic services
│   └── utils/            # Utility functions
└── public/               # Static assets
```

## Database Schema

The database includes tables for:

- **Core**: `users`, `markets`, `market_outcomes`, `bets`, `resolutions`
- **Social**: `follows`, `comments`, `challenges`, `notifications`
- **Reputation**: `taste_matches`, `trendsetter_events`, `leaderboard_snapshots`

See [lib/db/schema.ts](lib/db/schema.ts) for the complete schema.

## Development Phases

This is a proof-of-concept being built in phases:

- ✅ **Phase 1**: Foundation (Project setup, database, basic UI)
- ✅ **Phase 2**: Market System (Markets, betting, auto-generation)
- ✅ **Phase 3**: Authentic Opinion Engine (Blind period, dynamic odds, contrarian bonuses)
- ✅ **Phase 4**: Resolution and Payouts (Automated resolution, OMDb/Box Office integration)
- ✅ **Phase 5**: Social Features (Following, comments, challenges, notifications)
- ✅ **Phase 6**: Leaderboards and Admin Dashboard
- ✅ **Phase 7**: Testing and Deployment

See [HotTake_PRD_v2.md](HotTake_PRD_v2.md) for complete requirements.

### Documentation
- [Phase 7 Summary](docs/PHASE_7_SUMMARY.md) - Complete Phase 7 implementation details
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Testing Guide](docs/TESTING_CHECKLIST.md) - Comprehensive testing checklist
- [User Guide](docs/USER_GUIDE.md) - End-user documentation
- [Monitoring Guide](docs/MONITORING.md) - Error tracking and monitoring
- [Launch Checklist](docs/LAUNCH_CHECKLIST.md) - Pre-launch and launch day procedures

## Testing

The project includes comprehensive testing infrastructure:

### Test Coverage
- ✅ Unit tests for business logic
- ✅ Integration tests for API routes
- ✅ End-to-end tests for critical user journeys
- ✅ Performance tests for load and response times
- ✅ Cross-browser compatibility tests
- ✅ Mobile responsiveness tests

### Running Tests

```bash
# Install Playwright browsers (first time only)
npm run playwright:install

# Run all tests
npm run test:all

# Run specific test suites
npm run test              # Unit & integration tests
npm run test:e2e          # E2E tests
npm run test:integration  # Integration tests only

# Development workflow
npm run test:watch        # Auto-run tests on file changes
npm run test:e2e:ui       # Debug E2E tests with Playwright UI
```

See [tests/README.md](tests/README.md) for detailed testing documentation.

## Monitoring & Error Tracking

Production monitoring is configured with:

- **Sentry**: Error tracking, performance monitoring, session replay
- **Vercel Analytics**: Page performance and user analytics
- **Custom Metrics**: Application-specific tracking

See [docs/MONITORING.md](docs/MONITORING.md) for setup and configuration.

## Design System

The app uses a dark theme inspired by Kalshi's professional fintech aesthetic:

- **Background**: Deep Navy (#0D1117), Charcoal (#161B22), Dark Gray (#21262D)
- **Text**: White (#FFFFFF), Light Gray (#8B949E)
- **Accent**: Blue (#58A6FF), Purple (#A371F7 - contrarian), Amber (#D29922 - blind period)
- **Feedback**: Green (#3FB950 - positive), Red (#F85149 - negative)
- **Typography**: Inter (UI), JetBrains Mono (numbers)

## Contributing

This is currently a proof-of-concept project. Contributions, feedback, and suggestions are welcome!

## License

[Add your license here]

---

**Built with the Authentic Opinion Incentive System** - Because your genuine take matters more than following the crowd.
