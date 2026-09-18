"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Star, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type FourEPill = "evaluate" | "educate" | "experience" | "enable";

const PILLS: {
  id: FourEPill;
  label: string;
  icon: typeof Target;
  href?: string;
  disabled?: boolean;
}[] = [
  { id: "evaluate", label: "Evaluate", icon: Target, disabled: true },
  { id: "educate", label: "Educate", icon: BookOpen, disabled: true },
  { id: "experience", label: "Experience", icon: Star, href: "/admin/experience" },
  { id: "enable", label: "Enable", icon: ArrowRight, disabled: true },
];

export function FourEPillNav({
  active = "experience",
  className,
}: {
  active?: FourEPill;
  className?: string;
}) {
  return (
    <nav
      aria-label="4E framework"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1.5 shadow-[0_0_40px_rgba(0,229,255,0.08)] backdrop-blur-md",
        className
      )}
    >
      {PILLS.map((pill) => {
        const Icon = pill.icon;
        const isActive = pill.id === active;
        const classNames = cn(
          "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all duration-200 sm:px-4",
          isActive
            ? "bg-[#007BFF] text-white shadow-[0_0_24px_rgba(0,123,255,0.45)]"
            : "text-white/55 hover:bg-white/5 hover:text-white/85",
          pill.disabled && !isActive && "cursor-not-allowed opacity-50 hover:text-white/55"
        );

        if (pill.disabled || !pill.href) {
          return (
            <span key={pill.id} className={classNames} title="Coming soon">
              <Icon className="h-3.5 w-3.5" />
              {pill.label}
            </span>
          );
        }

        return (
          <Link key={pill.id} href={pill.href} className={classNames}>
            <Icon className="h-3.5 w-3.5" />
            {pill.label}
          </Link>
        );
      })}
    </nav>
  );
}
