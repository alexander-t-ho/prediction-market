"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/lib/db/schema";
import { AuthContextType, SessionData } from "@/lib/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = "hottake_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage on mount
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const sessionData = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData) {
        const session: SessionData = JSON.parse(sessionData);

        // Validate session (check if it's not too old - 30 days)
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - session.timestamp > thirtyDaysInMs) {
          // Session expired
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setIsLoading(false);
          return;
        }

        // Fetch user data from API
        const response = await fetch(`/api/users/${session.userId}`);
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // User not found, clear session
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const userData = await response.json();
      setUser(userData);

      // Save session to localStorage
      const session: SessionData = {
        userId: userData.id,
        username: userData.username,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (username: string, displayName: string, avatar?: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, avatar }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const userData = await response.json();
      setUser(userData);

      // Save session to localStorage
      const session: SessionData = {
        userId: userData.id,
        username: userData.username,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
