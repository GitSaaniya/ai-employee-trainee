"use client";

import Link from "next/link";
import { FourEPillNav } from "@/components/experience/four-e-pill-nav";
import { ExperienceChoiceCards } from "@/components/experience/choice-cards";
import { GenieShell } from "@/components/experience/genie-shell";
import { FadeIn } from "@/components/ui/motion";

export default function AdminExperiencePage() {
  return (
    <GenieShell>
      <div className="mb-10 flex flex-col items-center text-center">
        <FadeIn delay={40} duration={450} className="mb-8">
          <FourEPillNav active="experience" />
        </FadeIn>
        <FadeIn delay={110} duration={500}>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-[#00E5FF] uppercase">
            03 · Experience
          </p>
        </FadeIn>
        <FadeIn delay={160} duration={520}>
          <h1 className="font-[family-name:var(--font-experience-display)] mb-3 text-3xl tracking-tight text-white sm:text-4xl md:text-[2.75rem]">
            Build Your AI Assessment
          </h1>
        </FadeIn>
        <FadeIn delay={210} duration={540}>
          <p className="max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
            KNOLSKAPE AI Assessment helps you design immersive video interviews — from FMCG floor
            pitches to leadership conversations — scored for readiness.
          </p>
        </FadeIn>
      </div>
      <FadeIn delay={280} duration={560}>
        <ExperienceChoiceCards />
      </FadeIn>
      <FadeIn delay={360} duration={500} className="mt-8 text-center">
        <Link
          href="/admin/assessments"
          className="text-sm text-white/45 transition-colors duration-200 hover:text-[#00E5FF]"
        >
          View all AI Assessments →
        </Link>
      </FadeIn>
    </GenieShell>
  );
}
