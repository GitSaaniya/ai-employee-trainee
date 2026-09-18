"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GenieShell } from "@/components/experience/genie-shell";
import { CapabilityCard } from "@/components/experience/capability-card";
import { Button } from "@/components/ui/button";
import {
  getData,
  getEmployeeProfileIdForUser,
  getResultForAssignment,
  getSession,
} from "@/lib/data/store";
import type { Assessment, AssessmentResult } from "@/lib/types";

export default function AssessmentResultsPage() {
  const params = useParams<{ assignmentId: string }>();
  const [bundle, setBundle] = useState<{
    assessment: Assessment;
    result: AssessmentResult;
    name: string;
  } | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const data = getData();
    const auth = getSession();
    const employeeId = auth ? getEmployeeProfileIdForUser(auth.userId) : undefined;
    const assignment = data.assessmentAssignments.find((a) => a.id === params.assignmentId);
    if (!assignment || !employeeId || assignment.employeeId !== employeeId) {
      setMissing(true);
      return;
    }
    const assessment = data.assessments.find((a) => a.id === assignment.assessmentId);
    const result = getResultForAssignment(assignment.id, employeeId);
    if (!assessment || !result) {
      setMissing(true);
      return;
    }
    setBundle({ assessment, result, name: auth?.name ?? "Learner" });
  }, [params.assignmentId]);

  if (missing) {
    return (
      <GenieShell
        showBack
        backHref="/employee/assessments"
        homeHref="/employee/assessments"
        workspaceHref="/employee"
        workspaceLabel="Learner workspace"
      >
        <div className="mx-auto max-w-lg text-center text-white">
          <h1 className="text-2xl">Results not ready</h1>
          <p className="mt-2 text-sm text-white/50">Complete the interview first.</p>
          <Button asChild className="mt-6 bg-[#007BFF] text-white">
            <Link href={`/employee/assessments/${params.assignmentId}`}>Go to brief</Link>
          </Button>
        </div>
      </GenieShell>
    );
  }

  if (!bundle) {
    return (
      <div className="experience-theme flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
      </div>
    );
  }

  const { assessment, result, name } = bundle;

  return (
    <GenieShell
      showBack
      backHref="/employee/assessments"
      backLabel="My assessments"
      homeHref="/employee/assessments"
      workspaceHref="/employee"
      workspaceLabel="Learner workspace"
    >
      <div className="mb-8 text-center">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#00E5FF] uppercase">
          Assessment complete
        </p>
        <h1 className="font-[family-name:var(--font-experience-display)] mt-2 text-3xl text-white sm:text-4xl">
          Your readiness summary
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/50">{result.employeeSummary}</p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <CapabilityCard
          name={name}
          roleLabel={assessment.roleLabel}
          skillScores={result.skillScores}
          overallScore={result.overallScore}
          rubricSkills={assessment.rubricSkills}
          variant="employee"
        />
        <div className="rounded-2xl border border-white/10 bg-[#121821]/90 p-6">
          <h2 className="text-lg font-semibold text-white">What&apos;s next</h2>
          <p className="mt-2 text-sm text-white/55">
            Focus on your lowest skills, then reinforce with practice. Your admin sees full evidence.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {[...result.skillScores]
              .sort((a, b) => a.score - b.score)
              .slice(0, 2)
              .map((s) => (
                <li key={s.skillId} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  Practice <span className="text-[#00E5FF]">{s.name}</span> ({s.score}%)
                </li>
              ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF] text-white">
              <Link href="/employee/practice">
                Open practice area <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/employee/training">Continue simulation training</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/employee/assessments">Back to assessments</Link>
            </Button>
          </div>
          <p className="mt-4 text-[11px] text-white/35">
            Scored by {result.scoredBy === "groq" ? "Groq" : "Demo AI"}
          </p>
        </div>
      </div>
    </GenieShell>
  );
}
