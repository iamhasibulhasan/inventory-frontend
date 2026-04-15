'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/store';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import clsx from 'clsx';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token } = useAuthStore();
  const { sidebarCollapsed } = useUIStore();
  const router = useRouter();

  // Track hydration — Zustand loads from localStorage asynchronously.
  // We wait until after first render before checking auth,
  // so a hard refresh doesn't flash-redirect to login.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Give Zustand time to rehydrate from localStorage
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Only redirect after hydration is confirmed AND there is genuinely no token
    if (hydrated && !isAuthenticated && !token) {
      router.replace('/auth/login');
    }
  }, [hydrated, isAuthenticated, token, router]);

  // Show loading spinner while hydrating — prevents flashing login redirect
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center animate-pulse">
            <span className="text-white text-lg font-bold">I</span>
          </div>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // After hydration, if still not authenticated, show nothing (redirect happening)
  if (!isAuthenticated && !token) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <Topbar />
      <main className={clsx(
        'transition-all duration-300 pt-16 min-h-screen',
        sidebarCollapsed ? 'pl-[72px]' : 'pl-[256px]'
      )}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}