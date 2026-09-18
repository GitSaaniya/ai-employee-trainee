"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EXPERIENCE_TEMPLATES } from "@/lib/experience/templates";
import { cn } from "@/lib/utils";

export function ExperienceTemplateGrid({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {EXPERIENCE_TEMPLATES.map((template, index) => (
        <Link
          key={template.id}
          href={`/admin/assessments/new?template=${template.id}`}
          className={cn(
            "group flex flex-col rounded-2xl border bg-[#121821]/90 p-5 motion-lift",
            "animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-both duration-500",
            template.featured
              ? "border-[#00E5FF]/40 shadow-[0_0_32px_rgba(0,229,255,0.1)]"
              : "border-white/10 hover:border-[#00E5FF]/35"
          )}
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold tracking-[0.14em] text-[#00E5FF] uppercase">
              {template.domain}
            </span>
            {template.featured && (
              <span className="rounded-md bg-[#00E5FF]/12 px-2 py-0.5 text-[10px] font-semibold text-[#00E5FF]">
                Primary demo
              </span>
            )}
          </div>
          <h3 className="mb-2 text-lg font-semibold tracking-tight text-white">{template.title}</h3>
          <p className="mb-4 flex-1 text-sm leading-relaxed text-white/50">{template.description}</p>
          <p className="mb-4 text-xs text-white/35">
            {template.roleLabel} · {template.goal}
          </p>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/90 transition-colors group-hover:text-[#00E5FF]">
            Use this template
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  );
}
