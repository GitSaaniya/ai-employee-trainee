"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GenieShell } from "@/components/experience/genie-shell";
import { InterviewStage } from "@/components/experience/interview-stage";
import { Button } from "@/components/ui/button";
import {
  getData,
  getEmployeeProfileIdForUser,
  getSession,
  startAssessmentSession,
} from "@/lib/data/store";
import type { Assessment, AssessmentSession } from "@/lib/types";

export default function AssessmentInterviewPage() {
  const params = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const [bundle, setBundle] = useState<{
    assessment: Assessment;
    session: AssessmentSession;
    employeeName: string;
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
    if (assignment.status === "completed") {
      router.replace(`/employee/assessments/${assignment.id}/results`);
      return;
    }
    const assessment = data.assessments.find((a) => a.id === assignment.assessmentId);
    if (!assessment) {
      setMissing(true);
      return;
    }
    const session = startAssessmentSession({
      assignmentId: assignment.id,
      employeeId,
      camera: true,
      microphone: true,
      forceNew: true,
    });
    setBundle({ assessment, session, employeeName: auth?.name || "Learner" });
  }, [params.assignmentId, router]);

  if (missing) {
    return (
      <GenieShell
        showBack
        backHref="/employee/assessments"
        homeHref="/employee/assessments"
        workspaceHref="/employee"
        workspaceLabel="Learner workspace"
      >
        <div className="text-center text-white">
          <h1 className="text-2xl">Interview unavailable</h1>
          <Button asChild className="mt-6 bg-[#007BFF] text-white">
            <Link href="/employee/assessments">Back</Link>
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

  return (
    <GenieShell
      showBack
      backHref={`/employee/assessments/${params.assignmentId}`}
      backLabel="Brief"
      homeHref="/employee/assessments"
      workspaceHref="/employee"
      workspaceLabel="Learner workspace"
    >
      <div className="mb-6">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#00E5FF] uppercase">
          Live interview · Demo voice
        </p>
        <h1 className="font-[family-name:var(--font-experience-display)] mt-1 text-3xl text-white">
          {bundle.assessment.title}
        </h1>
      </div>
      <InterviewStage
        assessment={bundle.assessment}
        session={bundle.session}
        assignmentId={params.assignmentId}
        employeeName={bundle.employeeName}
      />
    </GenieShell>
  );
}
