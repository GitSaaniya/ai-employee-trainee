"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="experience-theme flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center text-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#007BFF] text-lg font-bold text-[#0B0E14] shadow-[0_0_20px_rgba(0,229,255,0.35)]">
        G
      </div>
      <h1 className="font-[family-name:var(--font-experience-display)] text-2xl text-white">Something went wrong</h1>
      <p className="max-w-md text-sm text-white/50">
        SkillSim AI hit an unexpected error. You can try again, or return to login if the problem continues.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/login")}>
          Go to login
        </Button>
      </div>
    </div>
  );
}
