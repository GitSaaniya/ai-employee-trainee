"use client";

import { GenieShell } from "@/components/experience/genie-shell";
import { ExperienceTemplateGrid } from "@/components/experience/template-grid";

export default function ExperienceTemplatesPage() {
  return (
    <GenieShell showBack backHref="/admin/experience" backLabel="Back">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-experience-display)] mb-2 text-3xl tracking-tight text-white sm:text-4xl">
          Select a Template
        </h1>
        <p className="max-w-xl text-sm text-white/50 sm:text-base">
          Available templates for AI Assessment. Primary demo: Mall Floor Shampoo Pitch (FMCG Sales).
        </p>
      </div>
      <ExperienceTemplateGrid />
    </GenieShell>
  );
}
