"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AssessmentAuthoringWizard } from "@/components/experience/assessment-wizard";
import { createBlankAssessment } from "@/lib/assessment/mock-generate";
import { applyTemplateToAssessment, EXPERIENCE_TEMPLATES } from "@/lib/experience/templates";
import { getData, saveAssessment } from "@/lib/data/store";
import type { AppData, Assessment } from "@/lib/types";

function NewAssessmentInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [bundle, setBundle] = useState<{ data: AppData; assessment: Assessment } | null>(null);

  useEffect(() => {
    const data = getData();
    const templateId = params.get("template") ?? undefined;
    const template = EXPERIENCE_TEMPLATES.find((t) => t.id === templateId);

    // Reuse one empty draft instead of creating Untitled rows on every visit
    const existingBlank = !template
      ? data.assessments.find(
          (a) =>
            a.status === "draft" &&
            !a.title.trim() &&
            !a.domain.trim() &&
            a.coreQuestions.length === 0
        )
      : undefined;

    let draft =
      existingBlank ?? createBlankAssessment(data.organisation.id, templateId);

    if (template) {
      const role = data.roles.find(
        (r) =>
          r.id === "role_fmcg_sales" ||
          r.name.toLowerCase().includes(template.roleLabel.toLowerCase().split(" ")[0] ?? "")
      );
      draft = applyTemplateToAssessment(
        draft,
        template,
        template.id === "tmpl_mall_shampoo" ? "role_fmcg_sales" : role?.id
      );
    }

    const saved = saveAssessment(draft);
    setBundle({ data: getData(), assessment: saved });
    router.replace(`/admin/assessments/${saved.id}`);
  }, [params, router]);

  if (!bundle) {
    return (
      <div className="experience-theme flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
      </div>
    );
  }

  return <AssessmentAuthoringWizard initial={bundle.assessment} data={bundle.data} />;
}

export default function NewAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="experience-theme flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
        </div>
      }
    >
      <NewAssessmentInner />
    </Suspense>
  );
}
