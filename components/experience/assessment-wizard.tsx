"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Loader2, Sparkles, Users } from "lucide-react";
import { AuthoringStepper, RefineSubStepper } from "@/components/experience/authoring-stepper";
import { GenieShell } from "@/components/experience/genie-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AppData, Assessment, AssessmentAuthoringStep } from "@/lib/types";
import {
  assignAssessmentToEmployees,
  applyGeneratedAssessmentContent,
  publishAssessment,
  saveAssessment,
} from "@/lib/data/store";
import { cn } from "@/lib/utils";

const fieldClass =
  "border-white/10 bg-[#0d1219] text-white placeholder:text-white/30 focus-visible:ring-[#00E5FF]";
const labelClass = "text-[11px] font-semibold tracking-[0.14em] text-white/45 uppercase";

export function AssessmentAuthoringWizard({
  initial,
  data,
}: {
  initial: Assessment;
  data: AppData;
}) {
  const [assessment, setAssessment] = useState<Assessment>(initial);
  const [generating, setGenerating] = useState(false);
  const [justPublished, setJustPublished] = useState(false);
  const [editingPublished, setEditingPublished] = useState(initial.status !== "published");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(() => {
    const existing = data.assessmentAssignments
      .filter((a) => a.assessmentId === initial.id)
      .map((a) => a.employeeId);
    return existing.length ? existing : ["ep_demo"];
  });
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const employees = useMemo(() => {
    return data.employeeProfiles
      .map((ep) => {
        const user = data.users.find((u) => u.id === ep.userId);
        const role = data.roles.find((r) => r.id === ep.roleId);
        return { ep, user, role };
      })
      .filter((row) => row.user)
      .filter((row) => roleFilter === "all" || row.ep.roleId === roleFilter);
  }, [data, roleFilter]);

  function patch(partial: Partial<Assessment>) {
    setAssessment((prev) => ({ ...prev, ...partial }));
  }

  function persist(next?: Assessment) {
    const saved = saveAssessment(next ?? assessment);
    setAssessment(saved);
    return saved;
  }

  function goStep(step: AssessmentAuthoringStep) {
    const saved = persist({ ...assessment, authoringStep: step });
    setAssessment(saved);
  }

  function enterEditMode(step: AssessmentAuthoringStep = "create") {
    setJustPublished(false);
    setEditingPublished(true);
    const saved = persist({ ...assessment, authoringStep: step });
    setAssessment(saved);
  }

  function handleCreateNext() {
    if (!assessment.title.trim() || !assessment.domain.trim() || !assessment.goal.trim()) {
      toast.error("Title, domain, and goal are required");
      return;
    }
    const saved = persist({
      ...assessment,
      authoringStep: "refine",
      refineSubStep: 1,
    });
    setAssessment(saved);
  }

  function handleRefineNext() {
    if (assessment.refineSubStep < 3) {
      const saved = persist({
        ...assessment,
        refineSubStep: (assessment.refineSubStep + 1) as 1 | 2 | 3,
      });
      setAssessment(saved);
      return;
    }
    goStep("generate");
  }

  async function handleGenerate() {
    setGenerating(true);
    const draft = persist({ ...assessment, status: "generating", authoringStep: "generate" });
    try {
      const res = await fetch("/api/assessment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessment: draft }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Generation failed");
      const saved = applyGeneratedAssessmentContent(draft.id, {
        persona: payload.persona,
        coreQuestions: payload.coreQuestions,
        rubricSkills: payload.rubricSkills,
      });
      setAssessment(saved);
      if (payload.warning) toast.message(payload.warning);
      else toast.success(payload.source === "groq" ? "Generated with Groq" : "Generated with Demo AI");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
      persist({ ...assessment, status: "draft", authoringStep: "generate" });
    } finally {
      setGenerating(false);
    }
  }

  function handleDeploy() {
    if (!selectedEmployees.length) {
      toast.error("Select at least one employee");
      return;
    }
    persist({ ...assessment, authoringStep: "deploy" });
    assignAssessmentToEmployees(assessment.id, selectedEmployees, new Date(dueAt).toISOString());
    const publishedAssessment = publishAssessment(assessment.id);
    setAssessment(publishedAssessment);
    toast.success("Successfully published");
    setJustPublished(true);
    setEditingPublished(false);
  }

  function toggleEmployee(id: string) {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectByRole(roleId: string) {
    const ids = data.employeeProfiles.filter((e) => e.roleId === roleId).map((e) => e.id);
    setSelectedEmployees((prev) => Array.from(new Set([...prev, ...ids])));
  }

  const assignedCount = useMemo(
    () =>
      data.assessmentAssignments.filter((a) => a.assessmentId === assessment.id).length ||
      selectedEmployees.length,
    [assessment.id, data.assessmentAssignments, selectedEmployees.length]
  );

  const analyticsHref = `/admin/assessments/${assessment.id}/analytics`;
  const isPublished = assessment.status === "published";
  const showPublishSuccess = justPublished && isPublished;
  const showPublishedHub = isPublished && !editingPublished && !justPublished;

  if (showPublishSuccess || showPublishedHub) {
    const isSuccess = showPublishSuccess;
    return (
      <GenieShell showBack backHref="/admin/assessments" backLabel="All assessments">
        <div className="flex min-h-[min(70vh,640px)] items-center justify-center px-2 py-10">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121821]/90 px-6 py-12 text-center shadow-sm sm:px-10 animate-in fade-in-0 zoom-in-95 duration-300">
            {isSuccess ? (
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#00E5FF]/10 ring-1 ring-[#00E5FF]/20">
                <CheckCircle2 className="h-6 w-6 text-[#00E5FF]" strokeWidth={2} />
              </div>
            ) : (
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#007BFF]/15 ring-1 ring-[#00E5FF]/20">
                <Sparkles className="h-6 w-6 text-[#00E5FF]" strokeWidth={2} />
              </div>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {isSuccess ? "Successfully published" : assessment.title || "Assessment"}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {isSuccess ? (
                <>
                  <span className="font-medium text-foreground">{assessment.title || "Assessment"}</span>{" "}
                  is live and assigned to {assignedCount} employee{assignedCount === 1 ? "" : "s"}.
                </>
              ) : (
                <>
                  This assessment is live ({assignedCount} assigned). Edit content and assignments, or open
                  analytics.
                </>
              )}
            </p>
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
              <Button
                type="button"
                variant="outline"
                className="border-white/15 bg-transparent text-white hover:bg-white/5"
                onClick={() => enterEditMode("create")}
              >
                Edit assessment
              </Button>
              <Button asChild>
                <Link href={analyticsHref}>Open analytics</Link>
              </Button>
            </div>
          </div>
        </div>
      </GenieShell>
    );
  }

  return (
    <GenieShell showBack backHref="/admin/assessments" backLabel="All assessments">
      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <AuthoringStepper active={assessment.authoringStep} onSelect={goStep} />

        <div className="rounded-2xl border border-white/10 bg-[#121821]/80 p-5 sm:p-7">
          {assessment.authoringStep === "create" && (
            <section className="space-y-5">
              <div>
                <h1 className="font-[family-name:var(--font-experience-display)] text-3xl text-white">
                  Create
                </h1>
                <p className="mt-1 text-sm text-white/50">
                  Set the assessment title, domain, audience, role and duration.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className={labelClass}>Title</Label>
                  <Input
                    className={cn("mt-2", fieldClass)}
                    value={assessment.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Mall Floor Shampoo Pitch"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Domain</Label>
                  <Input
                    className={cn("mt-2", fieldClass)}
                    value={assessment.domain}
                    onChange={(e) => patch({ domain: e.target.value })}
                    placeholder="FMCG Sales"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Role label</Label>
                  <Input
                    className={cn("mt-2", fieldClass)}
                    value={assessment.roleLabel}
                    onChange={(e) => patch({ roleLabel: e.target.value })}
                    placeholder="Sales Associate / Shopkeeper"
                  />
                  <p className="mt-1 text-xs text-white/35">
                    Job the employee performs in the scenario. The AI assesses them — it does not play this role.
                  </p>
                </div>
                <div>
                  <Label className={labelClass}>Linked role</Label>
                  <select
                    className={cn("mt-2 flex h-9 w-full rounded-md border px-3 text-sm", fieldClass)}
                    value={assessment.roleId ?? ""}
                    onChange={(e) => {
                      const role = data.roles.find((r) => r.id === e.target.value);
                      patch({
                        roleId: e.target.value || undefined,
                        roleLabel: role?.name ?? assessment.roleLabel,
                      });
                    }}
                  >
                    <option value="">Custom / none</option>
                    {data.roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className={labelClass}>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min={3}
                    max={30}
                    className={cn("mt-2", fieldClass)}
                    value={assessment.durationMinutes}
                    onChange={(e) => patch({ durationMinutes: Number(e.target.value) || 5 })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className={labelClass}>Overall goal</Label>
                  <Textarea
                    className={cn("mt-2", fieldClass)}
                    value={assessment.goal}
                    onChange={(e) => patch({ goal: e.target.value })}
                    placeholder="Sell shampoo in malls to walk-in shoppers"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Region</Label>
                  <Input
                    className={cn("mt-2", fieldClass)}
                    value={assessment.audienceMetadata.region}
                    onChange={(e) =>
                      patch({
                        audienceMetadata: { ...assessment.audienceMetadata, region: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className={labelClass}>Level</Label>
                  <Input
                    className={cn("mt-2", fieldClass)}
                    value={assessment.audienceMetadata.level}
                    onChange={(e) =>
                      patch({
                        audienceMetadata: { ...assessment.audienceMetadata, level: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className={labelClass}>Product focus</Label>
                  <Input
                    className={cn("mt-2", fieldClass)}
                    value={assessment.audienceMetadata.productFocus}
                    onChange={(e) =>
                      patch({
                        audienceMetadata: {
                          ...assessment.audienceMetadata,
                          productFocus: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className={labelClass}>Location type</Label>
                  <Input
                    className={cn("mt-2", fieldClass)}
                    value={assessment.audienceMetadata.locationType}
                    onChange={(e) =>
                      patch({
                        audienceMetadata: {
                          ...assessment.audienceMetadata,
                          locationType: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:col-span-2">
                  <div>
                    <div className="text-sm text-white">Adaptive follow-ups</div>
                    <div className="text-xs text-white/45">Hybrid: fixed core questions + LLM follow-ups</div>
                  </div>
                  <Switch
                    checked={assessment.adaptiveEnabled}
                    onCheckedChange={(v) => patch({ adaptiveEnabled: v })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  onClick={() => persist()}
                >
                  Save draft
                </Button>
                <Button
                  className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF] text-white"
                  onClick={handleCreateNext}
                >
                  Continue to Refine <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </section>
          )}

          {assessment.authoringStep === "refine" && (
            <section className="space-y-5">
              <RefineSubStepper active={assessment.refineSubStep} />
              {assessment.refineSubStep === 1 && (
                <>
                  <h1 className="font-[family-name:var(--font-experience-display)] text-3xl text-white">
                    Set Up Your Role-Play Goals
                  </h1>
                  <p className="text-sm text-white/50">Explain the overall goal and who the learner is.</p>
                  <div>
                    <Label className={labelClass}>Explain the overall goal of this assessment</Label>
                    <Textarea
                      className={cn("mt-2 min-h-[120px]", fieldClass)}
                      value={assessment.goal}
                      onChange={(e) => patch({ goal: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-white/35">{assessment.goal.length}/500</p>
                  </div>
                  <div>
                    <Label className={labelClass}>Who is the learner? Explain their role</Label>
                    <Textarea
                      className={cn("mt-2 min-h-[120px]", fieldClass)}
                      value={assessment.learnerPersona}
                      onChange={(e) => patch({ learnerPersona: e.target.value })}
                      placeholder="FMCG sales associate on a mall floor who must approach shoppers and sell shampoo"
                    />
                    <p className="mt-1 text-xs text-white/35">
                      Describe the employee&apos;s job in the scenario. Assessment questions will put them in this role.
                    </p>
                  </div>
                </>
              )}
              {assessment.refineSubStep === 2 && (
                <>
                  <h1 className="font-[family-name:var(--font-experience-display)] text-3xl text-white">
                    Describe your AI Persona
                  </h1>
                  <p className="text-sm text-white/50">
                    Configure the AI interviewer/assessor. Keep this as an assessor persona — not the shopkeeper or
                    job being assessed. The employee performs that role; the AI asks how they would handle it.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className={labelClass}>Persona name</Label>
                      <Input
                        className={cn("mt-2", fieldClass)}
                        value={assessment.persona.name}
                        onChange={(e) =>
                          patch({ persona: { ...assessment.persona, name: e.target.value } })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className={labelClass}>Persona style</Label>
                      <Textarea
                        className={cn("mt-2", fieldClass)}
                        value={assessment.persona.style}
                        onChange={(e) =>
                          patch({ persona: { ...assessment.persona, style: e.target.value } })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className={labelClass}>Voice / interaction notes</Label>
                      <Textarea
                        className={cn("mt-2", fieldClass)}
                        value={assessment.persona.voiceNotes}
                        onChange={(e) =>
                          patch({ persona: { ...assessment.persona, voiceNotes: e.target.value } })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
              {assessment.refineSubStep === 3 && (
                <>
                  <h1 className="font-[family-name:var(--font-experience-display)] text-3xl text-white">
                    Explain the Scenario
                  </h1>
                  <p className="text-sm text-white/50">
                    Set the situation the employee must navigate in the assessed role (e.g. sell shampoo as a
                    shopkeeper). The AI interviews them about it — it does not act as the shopkeeper.
                  </p>
                  <Textarea
                    className={cn("mt-2 min-h-[160px]", fieldClass)}
                    value={assessment.scenario}
                    onChange={(e) => patch({ scenario: e.target.value })}
                    placeholder="Busy mall aisle, time-pressed shopper, new shampoo SKU — employee is the shopkeeper who must approach and sell…"
                  />
                </>
              )}
              <div className="flex justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  onClick={() => {
                    if (assessment.refineSubStep > 1) {
                      persist({
                        ...assessment,
                        refineSubStep: (assessment.refineSubStep - 1) as 1 | 2 | 3,
                      });
                    } else goStep("create");
                  }}
                >
                  Back
                </Button>
                <Button
                  className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF] text-white"
                  onClick={handleRefineNext}
                >
                  {assessment.refineSubStep < 3 ? "Next" : "Continue to Generate"}{" "}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </section>
          )}

          {assessment.authoringStep === "generate" && (
            <section className="space-y-5">
              <div>
                <h1 className="font-[family-name:var(--font-experience-display)] text-3xl text-white">
                  Generate
                </h1>
                <p className="mt-1 text-sm text-white/50">
                  Demo AI / Groq authors core questions and scoring rubrics from your brief.
                </p>
              </div>

              {generating ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <div className="h-14 w-14 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
                  <div className="text-lg text-white">Building Your Assessment</div>
                  <div className="text-sm text-[#00E5FF]">Calibrating AI persona…</div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF] text-white shadow-[0_0_24px_rgba(0,229,255,0.35)]"
                      onClick={handleGenerate}
                    >
                      <Sparkles className="h-4 w-4" />
                      {assessment.coreQuestions.length ? "Regenerate with AI" : "Generate with AI"}
                    </Button>
                    {assessment.coreQuestions.length > 0 && (
                      <Button
                        className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF]/80 text-white"
                        onClick={() => goStep("deploy")}
                      >
                        Continue to Deploy <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {assessment.coreQuestions.length > 0 && (
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>
                        <h2 className="mb-3 text-sm font-semibold tracking-wide text-[#00E5FF] uppercase">
                          Core questions ({assessment.coreQuestions.length})
                        </h2>
                        <ol className="space-y-3">
                          {assessment.coreQuestions.map((q) => (
                            <li
                              key={q.id}
                              className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80"
                            >
                              <span className="mr-2 text-[#00E5FF]">{q.order}.</span>
                              {q.text}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <h2 className="mb-3 text-sm font-semibold tracking-wide text-[#00E5FF] uppercase">
                          Rubric skills
                        </h2>
                        <ul className="space-y-3">
                          {assessment.rubricSkills.map((s) => (
                            <li
                              key={s.id}
                              className="rounded-xl border border-white/10 bg-black/20 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-white">{s.name}</span>
                                <span className="text-xs text-[#00E5FF]">{s.weight}%</span>
                              </div>
                              <p className="mt-1 text-xs text-white/45">{s.descriptors}</p>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="text-xs tracking-wide text-white/40 uppercase">AI Persona</div>
                          <div className="mt-1 text-white">{assessment.persona.name}</div>
                          <p className="mt-1 text-sm text-white/55">{assessment.persona.style}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {assessment.authoringStep === "deploy" && (
            <section className="space-y-5">
              <>
                  <div>
                    <h1 className="font-[family-name:var(--font-experience-display)] text-3xl text-white">
                      Deploy
                    </h1>
                    <p className="mt-1 text-sm text-white/50">
                      Publish this AI Assessment and assign it to employees.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className={labelClass}>Due date</Label>
                      <Input
                        type="date"
                        className={cn("mt-2", fieldClass)}
                        value={dueAt}
                        onChange={(e) => setDueAt(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className={labelClass}>Filter by role</Label>
                      <select
                        className={cn("mt-2 flex h-9 w-full rounded-md border px-3 text-sm", fieldClass)}
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                      >
                        <option value="all">All roles</option>
                        {data.roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {assessment.roleId && (
                    <Button
                      variant="outline"
                      className="border-white/20 bg-transparent text-white hover:bg-white/10"
                      onClick={() => selectByRole(assessment.roleId!)}
                    >
                      <Users className="h-4 w-4" /> Select all in linked role
                    </Button>
                  )}

                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-white/10 p-3">
                    {employees.map(({ ep, user, role }) => {
                      const checked = selectedEmployees.includes(ep.id);
                      return (
                        <label
                          key={ep.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                            checked ? "bg-[#00E5FF]/10" : "hover:bg-white/5"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEmployee(ep.id)}
                            className="accent-[#00E5FF]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm text-white">{user?.name}</div>
                            <div className="truncate text-xs text-white/40">{role?.name}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap justify-between gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="border-white/20 bg-transparent text-white hover:bg-white/10"
                      onClick={() => goStep("generate")}
                    >
                      Back
                    </Button>
                    <Button
                      className="border-0 bg-gradient-to-r from-[#007BFF] to-[#00E5FF] text-white shadow-[0_0_24px_rgba(0,229,255,0.35)]"
                      onClick={handleDeploy}
                      disabled={generating}
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Publish & assign ({selectedEmployees.length})
                    </Button>
                  </div>
                </>
            </section>
          )}
        </div>
      </div>
    </GenieShell>
  );
}
