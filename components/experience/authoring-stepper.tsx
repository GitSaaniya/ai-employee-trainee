"use client";

import { cn } from "@/lib/utils";
import type { AssessmentAuthoringStep } from "@/lib/types";

const STEPS: { id: AssessmentAuthoringStep; num: string; title: string; description: string }[] = [
  {
    id: "create",
    num: "01",
    title: "Create",
    description: "Pick a template. Set goal, audience, role and duration.",
  },
  {
    id: "refine",
    num: "02",
    title: "Refine",
    description: "Tune scenario, persona and difficulty. Collaborate in real time.",
  },
  {
    id: "generate",
    num: "03",
    title: "Generate",
    description: "AI authors storyline, characters, scoring rubrics and feedback.",
  },
  {
    id: "deploy",
    num: "04",
    title: "Deploy",
    description: "Publish and assign. Web link out to learners same day.",
  },
];

export function AuthoringStepper({
  active,
  onSelect,
  className,
}: {
  active: AssessmentAuthoringStep;
  onSelect?: (step: AssessmentAuthoringStep) => void;
  className?: string;
}) {
  const activeIdx = STEPS.findIndex((s) => s.id === active);

  return (
    <aside className={cn("space-y-3", className)}>
      {STEPS.map((step, idx) => {
        const isActive = step.id === active;
        const isPast = idx < activeIdx;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelect?.(step.id)}
            className={cn(
              "w-full rounded-xl border p-4 text-left transition-all",
              isActive
                ? "border-[#00E5FF]/50 bg-white/5 shadow-[inset_3px_0_0_0_#00E5FF]"
                : "border-transparent bg-transparent hover:bg-white/5",
              !isActive && !isPast && "opacity-55"
            )}
          >
            <div
              className={cn(
                "font-[family-name:var(--font-experience-display)] text-2xl",
                isActive ? "text-[#00E5FF]" : "text-white/40"
              )}
            >
              {step.num}
            </div>
            <div className={cn("mt-1 text-base font-medium", isActive ? "text-white" : "text-white/70")}>
              {step.title}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-white/40">{step.description}</p>
          </button>
        );
      })}
    </aside>
  );
}

export function RefineSubStepper({
  active,
  className,
}: {
  active: 1 | 2 | 3;
  className?: string;
}) {
  const items = [
    { n: 1 as const, label: "Set Up Your Role-Play Goals" },
    { n: 2 as const, label: "Describe your AI Persona" },
    { n: 3 as const, label: "Explain the Scenario" },
  ];

  return (
    <div className={cn("mb-8 flex flex-wrap items-center gap-3", className)}>
      {items.map((item, idx) => (
        <div key={item.n} className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                item.n === active
                  ? "bg-[#007BFF] text-white"
                  : item.n < active
                    ? "bg-[#00E5FF]/20 text-[#00E5FF]"
                    : "bg-white/10 text-white/40"
              )}
            >
              {item.n}
            </span>
            <span className={cn("text-sm", item.n === active ? "text-white" : "text-white/45")}>
              {item.label}
            </span>
          </div>
          {idx < items.length - 1 && <span className="hidden h-px w-8 bg-white/15 sm:block" />}
        </div>
      ))}
    </div>
  );
}
