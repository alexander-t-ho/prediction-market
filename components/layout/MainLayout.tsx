"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import { AuthProvider } from "@/lib/contexts/AuthContext";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
