"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentRubricSkill, AssessmentSkillScore } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const FALLBACK_EXPLAIN: Record<string, string> = {
  "objection handling":
    "How well you acknowledge pushback and reframe value without sounding defensive.",
  "discovery questioning":
    "How well you ask open questions to understand needs before pitching.",
  "product knowledge":
    "How clearly and accurately you explain product benefits for the shopper.",
  "closing & next steps":
    "How well you ask for a decision or set a clear next step.",
};

function explainSkill(name: string, descriptor?: string): string {
  if (descriptor?.trim()) return descriptor.trim();
  const key = name.trim().toLowerCase();
  if (FALLBACK_EXPLAIN[key]) return FALLBACK_EXPLAIN[key];
  for (const [k, v] of Object.entries(FALLBACK_EXPLAIN)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return `How strong your answers were on “${name}” during the interview (0–100).`;
}

function MetricInfo({ label, text }: { label: string; text: string }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/45 transition-colors hover:border-[#00E5FF]/40 hover:text-[#00E5FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]/50"
          aria-label={`About ${label}`}
        >
          <Info className="h-3 w-3" strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-left leading-relaxed text-white/90">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function CapabilityCard({
  name,
  roleLabel,
  skillScores,
  overallScore,
  rubricSkills,
  className,
  variant = "employee",
}: {
  name: string;
  roleLabel: string;
  skillScores: AssessmentSkillScore[];
  overallScore: number;
  rubricSkills?: AssessmentRubricSkill[];
  className?: string;
  variant?: "employee" | "admin";
}) {
  const descriptorByName = new Map(
    (rubricSkills ?? []).map((r) => [r.name.trim().toLowerCase(), r.descriptors])
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#0d1219]/90 p-6",
        className
      )}
    >
      <p className="text-[10px] font-semibold tracking-[0.16em] text-[#00E5FF] uppercase">
        Learner Capability Card {variant === "admin" ? "· Admin" : "· Summary"}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#007BFF] to-[#a3e635] text-sm font-bold text-[#0B0E14]">
          {name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <div className="font-[family-name:var(--font-experience-display)] text-2xl text-white">
            {name}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-white/45">
            <span>
              {roleLabel} · Overall {overallScore}%
            </span>
            <MetricInfo
              label="Overall score"
              text="Overall readiness is the weighted average of your skill scores from the interview transcript, scored against this assessment’s rubric."
            />
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {skillScores.map((skill) => {
          const descriptor = descriptorByName.get(skill.name.trim().toLowerCase());
          return (
            <div key={skill.skillId}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 text-white/80">
                  <span className="truncate">{skill.name}</span>
                  <MetricInfo label={skill.name} text={explainSkill(skill.name, descriptor)} />
                </span>
                <span className="shrink-0 font-medium text-[#00E5FF]">{skill.score}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#007BFF] to-[#00E5FF]"
                  style={{ width: `${skill.score}%` }}
                />
              </div>
              {variant === "admin" && skill.evidence[0] && (
                <p className="mt-1.5 text-xs text-white/40 italic">&ldquo;{skill.evidence[0]}&rdquo;</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
