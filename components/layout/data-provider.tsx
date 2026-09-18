"use client";

import { useEffect, useState } from "react";
import { hydrateFromServer } from "@/lib/data/store";

/** Loads AppData from MongoDB before rendering the app shell. */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await hydrateFromServer();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="experience-theme flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
          <p className="text-xs text-white/45">Loading workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="fixed bottom-3 left-3 z-[100] max-w-sm rounded-lg border border-amber-500/30 bg-amber-950/80 px-3 py-2 text-xs text-amber-100">
          {error}
        </div>
      )}
      {children}
    </>
  );
}
