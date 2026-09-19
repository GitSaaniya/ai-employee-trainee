"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { GenieShell } from "@/components/experience/genie-shell";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";
import { getData } from "@/lib/data/store";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = {
  draft: "text-white/50",
  generating: "text-amber-300",
  ready: "text-[#00E5FF]",
  published: "text-emerald-300",
  archived: "text-white/35",
};

export default function AssessmentsListPage() {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    setData(getData());
  }, []);

  if (!data) {
    return (
      <div className="experience-theme flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
      </div>
    );
  }

  const assessments = [...data.assessments]
    .filter(
      (a) =>
        !(
          a.status === "draft" &&
          !a.title.trim() &&
          !a.domain.trim() &&
          a.coreQuestions.length === 0
        )
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <GenieShell showBack backHref="/admin/experience" backLabel="Experience">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <FadeIn duration={480}>
          <h1 className="font-[family-name:var(--font-experience-display)] text-3xl text-white sm:text-4xl">
            AI Assessments
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Author, publish, and assign Experience-layer video interviews.
          </p>
        </FadeIn>
        <FadeIn delay={80} duration={480}>
          <Button
            asChild
            className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF] text-white"
          >
            <Link href="/admin/experience">
              <Plus className="h-4 w-4" /> New assessment
            </Link>
          </Button>
        </FadeIn>
      </div>

      <div className="space-y-3">
        {assessments.map((a, index) => {
          const assigned = data.assessmentAssignments.filter((x) => x.assessmentId === a.id).length;
          const completed = data.assessmentAssignments.filter(
            (x) => x.assessmentId === a.id && x.status === "completed"
          ).length;
          return (
            <FadeIn key={a.id} delay={100 + index * 60} duration={450}>
              <div className="motion-lift flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#121821]/90 p-5 hover:border-[#00E5FF]/35 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/admin/assessments/${a.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold text-white">{a.title || "Untitled"}</h2>
                    <span className={cn("text-xs font-medium uppercase tracking-wide", statusColor[a.status])}>
                      {a.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/45">
                    {a.domain || "No domain"} · {a.roleLabel || "No role"} · {a.durationMinutes} min ·{" "}
                    {assigned} assigned · {completed} completed
                  </p>
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/admin/assessments/${a.id}/analytics`}
                    className="text-sm text-white/50 transition-colors duration-200 hover:text-[#00E5FF]"
                  >
                    Analytics
                  </Link>
                  <Link
                    href={`/admin/assessments/${a.id}`}
                    className="inline-flex items-center gap-1 text-sm text-white/70 transition-colors duration-200 hover:text-[#00E5FF]"
                  >
                    {a.status === "published" ? "Open" : "Edit"}{" "}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </FadeIn>
          );
        })}
        {assessments.length === 0 && (
          <FadeIn delay={100}>
            <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/45">
              No assessments yet. Create one from Experience.
            </div>
          </FadeIn>
        )}
      </div>
    </GenieShell>
  );
}
