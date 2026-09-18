"use client";

import Link from "next/link";
import { Cloud, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/ui/motion";

export function GenieShell({
  children,
  className,
  showBack,
  backHref = "/admin/experience",
  backLabel = "Back",
  homeHref = "/admin/experience",
  workspaceHref = "/admin",
  workspaceLabel = "Admin workspace",
}: {
  children: React.ReactNode;
  className?: string;
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  homeHref?: string;
  workspaceHref?: string;
  workspaceLabel?: string;
}) {
  return (
    <div className={cn("experience-theme relative min-h-screen text-white", className)}>
      <div className="experience-stars pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <FadeIn as="header" direction="down" duration={400} className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={homeHref} className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#007BFF] text-sm font-bold text-[#0B0E14] shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-transform duration-300 group-hover:scale-[1.04]">
                G
              </div>
              <div className="leading-tight">
                <div className="bg-gradient-to-r from-[#7dd3fc] to-[#00E5FF] bg-clip-text font-[family-name:var(--font-experience-display)] text-lg tracking-tight text-transparent">
                  Genie
                </div>
                <div className="-mt-0.5 text-[11px] font-medium tracking-wide text-white/70">Kreator</div>
              </div>
            </Link>
            <Link
              href={workspaceHref}
              className="hidden rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/45 transition-all duration-200 hover:border-white/20 hover:text-white/80 sm:inline-flex"
            >
              ← {workspaceLabel}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
              aria-label="Sync status"
            >
              <Cloud className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-[#007BFF] to-[#00E5FF] text-white transition-transform duration-200 hover:scale-[1.04]"
              aria-label="Profile"
            >
              <User className="h-4 w-4" />
            </button>
          </div>
        </FadeIn>

        {showBack && (
          <FadeIn delay={60} duration={400}>
            <Link
              href={backHref}
              className="mb-6 inline-flex w-fit items-center gap-1 text-sm text-white/50 transition-colors duration-200 hover:text-[#00E5FF]"
            >
              ← {backLabel}
            </Link>
          </FadeIn>
        )}

        <FadeIn as="main" delay={90} duration={520} className="flex-1 pb-10">
          {children}
        </FadeIn>
      </div>
    </div>
  );
}
