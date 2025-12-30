"use client";

import React, { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // If custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-2xl w-full bg-background-elevated rounded-lg p-8 border border-red-500/50">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-text-secondary text-lg">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
            </div>

            {/* Error Details (shown in development) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-background rounded-lg p-4 mb-6 border border-border-color">
                <h3 className="text-red-400 font-bold mb-2">Error Details:</h3>
                <pre className="text-xs text-text-secondary overflow-x-auto">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="text-red-400 cursor-pointer mb-2">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-text-secondary overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-semibold"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="px-6 py-3 bg-background border border-border-color text-white rounded-lg hover:bg-background-hover transition-colors font-semibold"
              >
                Go to Homepage
              </button>
            </div>

            {/* Support Information */}
            <div className="mt-8 text-center text-sm text-text-secondary">
              <p>
                If this problem persists, please{" "}
                <a
                  href="https://github.com/anthropics/claude-code/issues"
                  className="text-accent hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  report the issue
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper for page-level error boundaries
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Page Error
            </h2>
            <p className="text-text-secondary mb-6">
              This page encountered an error. Please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
