"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import AuthModal from "@/components/user/AuthModal";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/features/notifications/NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border bg-background-secondary/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary">HotTake</h1>
                  <p className="text-xs text-text-secondary">Put your opinions to the test</p>
                </div>
              </Link>

              {/* Main Navigation */}
              <div className="hidden items-center gap-1 md:flex">
                <Link href="/" className="nav-link">
                  Markets
                </Link>
                <Link href="/leaderboards" className="nav-link">
                  Leaderboards
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin" className="nav-link">
                    Admin
                  </Link>
                )}
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  {/* Balance Display */}
                  <div className="hidden items-center gap-2 rounded-lg bg-background-elevated px-3 py-2 sm:flex">
                    <span className="text-sm text-text-secondary">Balance:</span>
                    <span className="font-mono font-semibold text-accent-primary">
                      T${parseFloat(user.balance).toFixed(2)}
                    </span>
                  </div>

                  {/* Notification Bell */}
                  <NotificationBell />

                  {/* User Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 rounded-lg bg-background-elevated px-3 py-2 transition-colors hover:bg-background-primary"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.displayName}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-sm font-semibold text-white">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="hidden text-sm font-medium text-text-primary md:block">
                        {user.displayName}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 text-text-secondary transition-transform ${
                          showUserMenu ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowUserMenu(false)}
                        ></div>
                        <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-border bg-background-elevated py-1 shadow-lg">
                          <Link
                            href={`/profile/${user.username}`}
                            className="dropdown-item"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            My Profile
                          </Link>
                          <Link
                            href="/my-bets"
                            className="dropdown-item"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            My Bets
                          </Link>
                          <div className="my-1 border-t border-border"></div>
                          <button onClick={logout} className="dropdown-item w-full text-left">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            Logout
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <Button onClick={() => setShowAuthModal(true)}>Get Started</Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Global Styles for Navigation */}
      <style jsx global>{`
        .nav-link {
          @apply px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary rounded-lg hover:bg-background-elevated;
        }

        .dropdown-item {
          @apply flex items-center gap-2 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-background-secondary;
        }
      `}</style>
    </>
  );
}
