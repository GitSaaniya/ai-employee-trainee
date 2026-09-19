"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, Video } from "lucide-react";
import { GenieShell } from "@/components/experience/genie-shell";
import { Button } from "@/components/ui/button";
import {
  getData,
  getEmployeeProfileIdForUser,
  getSession,
  startAssessmentSession,
} from "@/lib/data/store";
import type { AppData, Assessment, AssessmentAssignment } from "@/lib/types";
import { toast } from "sonner";

export default function AssessmentIntroPage() {
  const params = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const [bundle, setBundle] = useState<{
    data: AppData;
    assignment: AssessmentAssignment;
    assessment: Assessment;
    employeeId: string;
    employeeName: string;
  } | null>(null);
  const [missing, setMissing] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const data = getData();
    const session = getSession();
    const employeeId = session ? getEmployeeProfileIdForUser(session.userId) : undefined;
    const assignment = data.assessmentAssignments.find((a) => a.id === params.assignmentId);
    const assessment = assignment
      ? data.assessments.find((a) => a.id === assignment.assessmentId)
      : undefined;
    if (!assignment || !assessment || !employeeId || assignment.employeeId !== employeeId) {
      setMissing(true);
      return;
    }
    if (assignment.status === "completed") {
      router.replace(`/employee/assessments/${assignment.id}/results`);
      return;
    }
    setBundle({
      data,
      assignment,
      assessment,
      employeeId,
      employeeName: session?.name ?? "Learner",
    });
  }, [params.assignmentId, router]);

  async function handleStart() {
    if (!bundle) return;
    setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach((t) => t.stop());
      startAssessmentSession({
        assignmentId: bundle.assignment.id,
        employeeId: bundle.employeeId,
        camera: true,
        microphone: true,
        forceNew: true,
      });
      router.push(`/employee/assessments/${bundle.assignment.id}/interview`);
    } catch {
      toast.error("Please allow camera and microphone access to continue");
      setStarting(false);
    }
  }

  if (missing) {
    return (
      <GenieShell
      showBack
      backHref="/employee/assessments"
      backLabel="My assessments"
      homeHref="/employee/assessments"
      workspaceHref="/employee"
      workspaceLabel="Learner workspace"
    >
        <div className="mx-auto max-w-lg text-center text-white">
          <h1 className="text-2xl">Assignment not found</h1>
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

  const { assessment } = bundle;

  return (
    <GenieShell
      showBack
      backHref="/employee/assessments"
      backLabel="My assessments"
      homeHref="/employee/assessments"
      workspaceHref="/employee"
      workspaceLabel="Learner workspace"
    >
      <div className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-[#00E5FF] uppercase">
        Experience · AI Assessment
      </div>
      <h1 className="font-[family-name:var(--font-experience-display)] mb-8 text-3xl text-white sm:text-4xl">
        {assessment.title}
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#121821]/90 p-6">
          <h2 className="mb-3 text-xl font-semibold text-white">
            Your <span className="text-[#00E5FF]">AI Assessment</span> brief
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-white/55">{assessment.goal}</p>
          <p className="mb-4 rounded-lg border border-[#00E5FF]/20 bg-[#00E5FF]/5 px-3 py-2 text-xs leading-relaxed text-white/70">
            You will play <span className="font-medium text-white">{assessment.roleLabel || "the assessed role"}</span> in
            this scenario. The AI interviewer assesses how you respond — it will not perform that role for you.
          </p>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[10px] tracking-wider text-white/35 uppercase">Your role</dt>
              <dd className="text-white/80">{assessment.roleLabel}</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-wider text-white/35 uppercase">Scenario</dt>
              <dd className="text-white/80">{assessment.scenario}</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-wider text-white/35 uppercase">Duration</dt>
              <dd className="text-white/80">~{assessment.durationMinutes} minutes · {assessment.coreQuestions.length} core questions</dd>
            </div>
          </dl>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: Mic, label: "Voice-first" },
              { icon: Video, label: "Camera preview" },
              { icon: Mic, label: "Smart turns" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-black/20 p-3 text-center"
              >
                <item.icon className="mx-auto mb-1 h-4 w-4 text-[#00E5FF]" />
                <div className="text-[11px] text-white/60">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121821]/90 p-6">
          <div className="mb-4 flex h-40 items-center justify-center rounded-xl bg-gradient-to-br from-[#007BFF]/30 to-[#00E5FF]/10">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#007BFF] to-[#00E5FF] text-2xl font-bold text-[#0B0E14]">
              {(assessment.persona.name || "AI").slice(0, 2).toUpperCase()}
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">
            Meet {assessment.persona.name || "your AI interviewer"}
          </h2>
          <p className="text-xs uppercase tracking-wider text-white/40">
            {(assessment.persona.gender ?? "female") === "male" ? "Male" : "Female"} assessor
            {assessment.persona.voiceId ? ` · voice ${assessment.persona.voiceId}` : ""}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/55">{assessment.persona.style}</p>
          <p className="mt-3 text-xs text-white/40">{assessment.persona.voiceNotes}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button
          className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF] px-8 text-white shadow-[0_0_28px_rgba(0,229,255,0.35)]"
          onClick={() => void handleStart()}
          disabled={starting}
        >
          <Mic className="h-4 w-4" />
          {starting ? "Requesting permissions…" : `Start talking to ${assessment.persona.name || "AI"}`}
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-white/20 bg-transparent text-white hover:bg-white/10"
        >
          <Link href="/employee/assessments">Back</Link>
        </Button>
      </div>
      <p className="mt-4 text-center text-xs text-white/40">
        We&apos;ll ask for camera and microphone. Video is preview-only and not recorded in this MVP.
      </p>
    </GenieShell>
  );
}
