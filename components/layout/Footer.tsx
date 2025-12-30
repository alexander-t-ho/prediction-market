import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <h3 className="mb-2 text-lg font-bold text-text-primary">HotTake</h3>
            <p className="text-sm text-text-secondary">
              Put your opinions to the test with authentic prediction markets for movies.
            </p>
          </div>

          {/* Markets */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase text-text-primary">Markets</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="footer-link">
                  All Markets
                </Link>
              </li>
              <li>
                <Link href="/?filter=blind" className="footer-link">
                  Blind Period
                </Link>
              </li>
              <li>
                <Link href="/?filter=open" className="footer-link">
                  Open Markets
                </Link>
              </li>
              <li>
                <Link href="/?filter=resolved" className="footer-link">
                  Resolved
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase text-text-primary">Community</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/leaderboards" className="footer-link">
                  Leaderboards
                </Link>
              </li>
              <li>
                <Link href="/leaderboards?tab=trendsetters" className="footer-link">
                  Trendsetters
                </Link>
              </li>
              <li>
                <Link href="/leaderboards?tab=contrarians" className="footer-link">
                  Top Contrarians
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase text-text-primary">About</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/how-it-works" className="footer-link">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/authentic-opinion" className="footer-link">
                  Authentic Opinion System
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/yourusername/hottake"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-link"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 border-t border-border pt-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-text-secondary">
              © {currentYear} HotTake. Built with the Authentic Opinion Incentive System.
            </p>
            <div className="flex gap-4">
              <span className="text-sm text-text-secondary">PoC v0.1.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Footer Styles */}
      <style jsx global>{`
        .footer-link {
          @apply text-sm text-text-secondary transition-colors hover:text-text-primary;
        }
      `}</style>
    </footer>
  );
}
