"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import AhaduLogo from "@/components/AhaduLogo";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, _hasHydrated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Only run after the store has been hydrated from localStorage.
    // This prevents checkAuth from firing on the server or before hydration.
    if (_hasHydrated) {
      checkAuth();
    }
  }, [_hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (_hasHydrated && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [_hasHydrated, isAuthenticated, isLoading, router]);

  // Block render until the client has read localStorage.
  // This keeps server HTML and first client render identical → no hydration error.
  if (!_hasHydrated) {
    return null;
  }

  // Show spinner only when we have a token but are waiting for /auth/me response
  // (first visit after a fresh login without a persisted session).
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center p-2"
            style={{ boxShadow: "0 8px 24px rgba(155,21,53,0.2)" }}
          >
            <AhaduLogo size={52} />
          </div>
          <div className="flex gap-1.5">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: "#9B1535", animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400">Loading platform...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-[#F5F5F5]">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
