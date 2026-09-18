"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AssessmentAuthoringWizard } from "@/components/experience/assessment-wizard";
import { GenieShell } from "@/components/experience/genie-shell";
import { Button } from "@/components/ui/button";
import { getData } from "@/lib/data/store";
import type { AppData, Assessment } from "@/lib/types";

export default function AssessmentDetailPage() {
  const params = useParams<{ id: string }>();
  const [bundle, setBundle] = useState<{ data: AppData; assessment: Assessment } | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const data = getData();
    const assessment = data.assessments.find((a) => a.id === params.id);
    if (!assessment) {
      setMissing(true);
      return;
    }
    setBundle({ data, assessment });
  }, [params.id]);

  if (missing) {
    return (
      <GenieShell showBack backHref="/admin/assessments">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl text-white">Assessment not found</h1>
          <Button asChild className="mt-6 bg-[#007BFF] text-white">
            <Link href="/admin/assessments">Back to list</Link>
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

  return <AssessmentAuthoringWizard initial={bundle.assessment} data={bundle.data} />;
}
