"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GenieShell } from "@/components/experience/genie-shell";
import { CapabilityCard } from "@/components/experience/capability-card";
import { CohortHeatmap, DeployNextPanel } from "@/components/experience/cohort-heatmap";
import { Button } from "@/components/ui/button";
import { suggestDeployNext } from "@/lib/assessment/deploy-next";
import { getData } from "@/lib/data/store";
import type { AppData } from "@/lib/types";
import { average } from "@/lib/utils";

export default function AssessmentAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    setData(getData());
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const assessment = data.assessments.find((a) => a.id === params.id);
    if (!assessment) return null;
    const results = data.assessmentResults.filter((r) => r.assessmentId === assessment.id);
    const rows = results.map((result) => {
      const ep = data.employeeProfiles.find((e) => e.id === result.employeeId);
      const user = data.users.find((u) => u.id === ep?.userId);
      const scores: Record<string, number> = {};
      for (const s of result.skillScores) scores[s.name] = s.score;
      return {
        result,
        name: user?.name ?? "Learner",
        scores,
        overall: result.overallScore,
      };
    });

    const skillNames =
      assessment.rubricSkills.length > 0
        ? assessment.rubricSkills.map((s) => s.name)
        : Array.from(new Set(results.flatMap((r) => r.skillScores.map((s) => s.name))));

    const cohort = skillNames.map((name) => {
      const scores = results
        .map((r) => r.skillScores.find((s) => s.name === name)?.score)
        .filter((n): n is number => typeof n === "number");
      return {
        name,
        avg: scores.length ? Math.round(average(scores)) : 0,
        n: scores.length,
      };
    });

    const overallAvg = results.length
      ? Math.round(average(results.map((r) => r.overallScore)))
      : 0;

    const weakest = [...cohort].sort((a, b) => a.avg - b.avg);
    const deployNext = suggestDeployNext(data, weakest);

    return {
      assessment,
      rows,
      skillNames,
      cohort,
      overallAvg,
      completed: results.length,
      deployNext,
      heatmapRows: rows.map((r) => ({
        name: r.name,
        scores: r.scores,
        overall: r.overall,
      })),
    };
  }, [data, params.id]);

  if (!data) {
    return (
      <div className="experience-theme flex min-h-screen items-center justify-center" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
        <span className="sr-only">Loading analytics</span>
      </div>
    );
  }

  if (!view) {
    return (
      <GenieShell showBack backHref="/admin/assessments">
        <div className="text-center text-white">
          <h1 className="text-2xl">Assessment not found</h1>
          <Button asChild className="mt-6 bg-[#007BFF] text-white">
            <Link href="/admin/assessments">Back to list</Link>
          </Button>
        </div>
      </GenieShell>
    );
  }

  return (
    <GenieShell showBack backHref={`/admin/assessments/${params.id}`} backLabel="Assessment">
      <div className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#00E5FF] uppercase">
          Skills intelligence · Admin
        </p>
        <h1 className="font-[family-name:var(--font-experience-display)] mt-2 text-3xl text-white">
          {view.assessment.title}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Individual evidence, cohort heatmaps, and deploy-next recommendations for CHRO / CEO review.
        </p>
      </div>

      {view.completed >= 1 && (
        <>
          <div className="mb-8 rounded-2xl border border-white/10 bg-[#121821]/90 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Cohort snapshot</h2>
              <p className="text-xs text-white/45">
                {view.completed} completion{view.completed === 1 ? "" : "s"} · avg readiness{" "}
                {view.overallAvg}%
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {view.cohort.map((skill) => (
                <div key={skill.name} className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="text-xs text-white/45">{skill.name}</div>
                  <div className="mt-1 text-2xl font-semibold text-[#00E5FF]">{skill.avg}%</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#007BFF] to-[#00E5FF]"
                      style={{ width: `${skill.avg}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Cohort heatmap</h2>
            <CohortHeatmap skillNames={view.skillNames} rows={view.heatmapRows} />
          </div>

          <div className="mb-8">
            <DeployNextPanel suggestions={view.deployNext} />
          </div>
        </>
      )}

      {view.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/45">
          <p className="text-base text-white/70">No completions yet</p>
          <p className="mt-2 text-sm">
            Publish the assessment, assign learners, then return here for heatmaps and deploy-next
            actions.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-[#007BFF] text-white">
              <Link href={`/admin/assessments/${params.id}`}>Open authoring / deploy</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/admin/experience">Experience home</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Individual reports</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {view.rows.map(({ result, name }) => (
              <div key={result.id} className="space-y-3">
                <CapabilityCard
                  name={name}
                  roleLabel={view.assessment.roleLabel}
                  skillScores={result.skillScores}
                  overallScore={result.overallScore}
                  rubricSkills={view.assessment.rubricSkills}
                  variant="admin"
                />
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] tracking-wider text-white/35 uppercase">
                      Admin report
                    </span>
                    <span className="text-[10px] text-[#00E5FF] uppercase">{result.scoredBy}</span>
                  </div>
                  {result.adminReport}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </GenieShell>
  );
}
