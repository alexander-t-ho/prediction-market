"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (mode === "register") {
        await register(username, displayName, avatar || undefined);
      } else {
        await login(username);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md rounded-lg bg-background-elevated p-6">
        <h2 className="mb-6 text-2xl font-semibold text-text-primary">
          {mode === "register" ? "Create Account" : "Welcome Back"}
        </h2>

        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-lg px-4 py-2 font-medium transition-colors ${
              mode === "register"
                ? "bg-accent-primary text-white"
                : "bg-background-secondary text-text-secondary hover:bg-background-primary"
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg px-4 py-2 font-medium transition-colors ${
              mode === "login"
                ? "bg-accent-primary text-white"
                : "bg-background-secondary text-text-secondary hover:bg-background-primary"
            }`}
          >
            Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-text-primary">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-border bg-background-secondary px-4 py-2 text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
              placeholder="Enter username"
              required
              minLength={3}
              maxLength={50}
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-1 block text-sm font-medium text-text-primary"
                >
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background-secondary px-4 py-2 text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                  placeholder="Enter display name"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label
                  htmlFor="avatar"
                  className="mb-1 block text-sm font-medium text-text-primary"
                >
                  Avatar URL (optional)
                </label>
                <input
                  type="text"
                  id="avatar"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background-secondary px-4 py-2 text-text-primary placeholder-text-secondary focus:border-accent-primary focus:outline-none"
                  placeholder="Enter avatar URL"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-negative/10 px-4 py-2 text-sm text-negative">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-background-secondary px-4 py-2 font-medium text-text-primary transition-colors hover:bg-background-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-accent-primary px-4 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Please wait..." : mode === "register" ? "Register" : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
