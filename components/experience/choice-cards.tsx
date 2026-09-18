"use client";

import Link from "next/link";
import { ArrowRight, Check, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    href: "/admin/assessments/new",
    recommended: true,
    category: "Build custom",
    title: "Start from Scratch",
    description:
      "Define your scenarios, configure an AI persona, and build an AI Assessment tailored to your role and metadata.",
    features: [
      "Design custom evaluation scenarios",
      "AI-powered persona configuration",
      "Full customization & review",
    ],
    cta: "Get Started",
    icon: Plus,
  },
  {
    href: "/admin/experience/templates",
    recommended: false,
    category: "Quick start",
    title: "Use a Template",
    description: "Choose from ready-made AI Assessment templates designed for common readiness scenarios.",
    features: [
      "Pre-configured scenarios & personas",
      "Industry best practices",
      "Launch in seconds",
    ],
    cta: "Browse Templates",
    icon: Sparkles,
  },
] as const;

export function ExperienceChoiceCards({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-5 lg:grid-cols-2", className)}>
      {CARDS.map((card, index) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.href}
            href={card.href}
            className={cn(
              "group relative flex flex-col rounded-2xl border bg-[#0d1219]/80 p-6 motion-lift sm:p-7",
              "animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-500",
              card.recommended
                ? "border-[#00E5FF]/55 shadow-[0_0_0_1px_rgba(0,229,255,0.25),0_0_48px_rgba(0,229,255,0.12)]"
                : "border-white/10 hover:border-white/20"
            )}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {card.recommended && (
              <span className="absolute top-4 right-4 rounded-md bg-[#00E5FF]/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#00E5FF] uppercase">
                Recommended
              </span>
            )}
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#00E5FF]/15 text-[#00E5FF] ring-1 ring-[#00E5FF]/25 transition-transform duration-300 group-hover:scale-105">
              <Icon className="h-5 w-5" />
            </div>
            <p className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-[#00E5FF] uppercase">
              {card.category}
            </p>
            <h2 className="mb-2 text-2xl font-semibold tracking-tight text-white">{card.title}</h2>
            <p className="mb-5 text-sm leading-relaxed text-white/55">{card.description}</p>
            <ul className="mb-8 space-y-2.5">
              {card.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-white/75">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#00E5FF]/15 text-[#00E5FF]">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-white transition-colors group-hover:text-[#00E5FF]">
              {card.cta}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
