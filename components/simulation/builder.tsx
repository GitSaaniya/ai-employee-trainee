"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import type { AppData, Simulation, SimulationStage } from "@/lib/types";
import { saveSimulation } from "@/lib/data/store";
import { uid } from "@/lib/utils";
import { SimulationPlayer } from "@/components/simulation/player";

const STEPS = ["Define", "Configure", "Build", "Scoring", "Preview", "Publish"] as const;

function emptyStage(simulationId: string, order: number): SimulationStage {
  const stageId = uid("stage");
  return {
    id: stageId,
    simulationId,
    order,
    title: `Stage ${order}`,
    situation: "",
    characterName: "Stakeholder",
    characterRole: "Colleague",
    characterMessage: "",
    decisionPrompt: "What do you do?",
    policyReference: "",
    options: ["A", "B", "C", "D"].map((label, i) => ({
      id: uid("opt"),
      stageId,
      label,
      text: "",
      score: i === 0 ? 90 : 40,
      isBest: i === 0,
      isCriticalFailure: i === 3,
      competencyImpacts: {},
      feedback: "",
      consequence: "",
    })),
  };
}

export function SimulationBuilder({
  initial,
  data,
  onSaved,
}: {
  initial: Simulation;
  data: AppData;
  onSaved?: (sim: Simulation) => void;
}) {
  const [step, setStep] = useState(0);
  const [sim, setSim] = useState<Simulation>(initial);
  const [generating, setGenerating] = useState(false);
  const [aiLabel, setAiLabel] = useState<string | null>(null);

  const weightSum = useMemo(
    () => Object.values(sim.competencyWeights).reduce((a, b) => a + b, 0),
    [sim.competencyWeights]
  );

  function update<K extends keyof Simulation>(key: K, value: Simulation[K]) {
    setSim((s) => ({ ...s, [key]: value }));
  }

  async function generateWithAI() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sim.title || "Generated simulation",
          businessProblem: sim.businessProblem || "A workplace decision under pressure.",
          targetRoleId: sim.targetRoleId,
          learningObjective: sim.learningObjective || "Practise role-critical decisions.",
          difficulty: sim.difficulty,
          competencyIds: sim.assessedCompetencyIds.length
            ? sim.assessedCompetencyIds
            : data.competencies.slice(0, 3).map((c) => c.id),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error("Generation failed");
      setSim((s) => ({
        ...payload.simulation,
        id: s.id,
        organisationId: s.organisationId,
        status: s.status,
      }));
      setAiLabel(payload.label ?? (payload.source === "demo_ai" ? "Demo AI generation" : "AI generation"));
      toast.success(payload.source === "demo_ai" ? "Demo AI generation complete" : "AI generation complete");
      setStep(2);
    } catch {
      toast.error("Could not generate simulation");
    } finally {
      setGenerating(false);
    }
  }

  function persist(status?: Simulation["status"]) {
    const saved = saveSimulation({ ...sim, status: status ?? sim.status });
    setSim(saved);
    onSaved?.(saved);
    toast.success(status === "published" ? "Simulation published" : "Draft saved");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${step === i ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>
      {aiLabel && <Badge variant="secondary">{aiLabel}</Badge>}

      {step === 0 && (
        <Card>
          <CardHeader><CardTitle>Define</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Title</Label><Input value={sim.title} onChange={(e) => update("title", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Business problem</Label><Textarea value={sim.businessProblem} onChange={(e) => update("businessProblem", e.target.value)} /></div>
            <div>
              <Label>Target role</Label>
              <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={sim.targetRoleId} onChange={(e) => update("targetRoleId", e.target.value)}>
                {data.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={sim.difficulty} onChange={(e) => update("difficulty", e.target.value as Simulation["difficulty"])}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="md:col-span-2"><Label>Learning objective</Label><Textarea value={sim.learningObjective} onChange={(e) => update("learningObjective", e.target.value)} /></div>
            <div><Label>Estimated duration (minutes)</Label><Input type="number" value={sim.estimatedDurationMinutes} onChange={(e) => update("estimatedDurationMinutes", Number(e.target.value))} /></div>
            <div className="flex items-end">
              <Button type="button" variant="secondary" disabled={generating} onClick={generateWithAI}>
                {generating ? "Generating…" : "Generate with AI"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Configure</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Scenario context</Label><Textarea value={sim.scenarioContext} onChange={(e) => update("scenarioContext", e.target.value)} /></div>
            <div><Label>Characters (comma-separated)</Label><Input value={sim.characters.join(", ")} onChange={(e) => update("characters", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></div>
            <div><Label>Employee responsibility</Label><Textarea value={sim.employeeResponsibility} onChange={(e) => update("employeeResponsibility", e.target.value)} /></div>
            <div><Label>Constraints (semicolon-separated)</Label><Input value={sim.constraints.join("; ")} onChange={(e) => update("constraints", e.target.value.split(";").map((s) => s.trim()).filter(Boolean))} /></div>
            <div><Label>Policies (semicolon-separated)</Label><Input value={sim.policies.join("; ")} onChange={(e) => update("policies", e.target.value.split(";").map((s) => s.trim()).filter(Boolean))} /></div>
            <div>
              <Label>Competencies assessed</Label>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {data.competencies.map((c) => {
                  const checked = sim.assessedCompetencyIds.includes(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const ids = e.target.checked
                            ? [...sim.assessedCompetencyIds, c.id]
                            : sim.assessedCompetencyIds.filter((id) => id !== c.id);
                          const weights = { ...sim.competencyWeights };
                          if (e.target.checked && !weights[c.id]) weights[c.id] = 10;
                          if (!e.target.checked) delete weights[c.id];
                          setSim((s) => ({ ...s, assessedCompetencyIds: ids, competencyWeights: weights }));
                        }}
                      />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {sim.stages.map((stage, si) => (
            <Card key={stage.id}>
              <CardHeader>
                <CardTitle className="text-base">Stage {si + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input value={stage.title} onChange={(e) => {
                  const stages = [...sim.stages];
                  stages[si] = { ...stage, title: e.target.value };
                  update("stages", stages);
                }} placeholder="Stage title" />
                <Textarea value={stage.situation} onChange={(e) => {
                  const stages = [...sim.stages];
                  stages[si] = { ...stage, situation: e.target.value };
                  update("stages", stages);
                }} placeholder="Situation" />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input value={stage.characterName} onChange={(e) => {
                    const stages = [...sim.stages];
                    stages[si] = { ...stage, characterName: e.target.value };
                    update("stages", stages);
                  }} placeholder="Character name" />
                  <Input value={stage.characterRole} onChange={(e) => {
                    const stages = [...sim.stages];
                    stages[si] = { ...stage, characterRole: e.target.value };
                    update("stages", stages);
                  }} placeholder="Character role" />
                </div>
                <Textarea value={stage.characterMessage} onChange={(e) => {
                  const stages = [...sim.stages];
                  stages[si] = { ...stage, characterMessage: e.target.value };
                  update("stages", stages);
                }} placeholder="Character message" />
                <Input value={stage.decisionPrompt} onChange={(e) => {
                  const stages = [...sim.stages];
                  stages[si] = { ...stage, decisionPrompt: e.target.value };
                  update("stages", stages);
                }} placeholder="Decision prompt" />
                {stage.options.map((opt, oi) => (
                  <div key={opt.id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium">Option {opt.label}</div>
                    <Textarea value={opt.text} onChange={(e) => {
                      const stages = [...sim.stages];
                      const options = [...stage.options];
                      options[oi] = { ...opt, text: e.target.value };
                      stages[si] = { ...stage, options };
                      update("stages", stages);
                    }} />
                    <div className="grid gap-2 md:grid-cols-4">
                      <Input type="number" value={opt.score} onChange={(e) => {
                        const stages = [...sim.stages];
                        const options = [...stage.options];
                        options[oi] = { ...opt, score: Number(e.target.value) };
                        stages[si] = { ...stage, options };
                        update("stages", stages);
                      }} />
                      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={opt.isBest} onChange={(e) => {
                        const stages = [...sim.stages];
                        const options = stage.options.map((o, idx) => ({ ...o, isBest: idx === oi ? e.target.checked : false }));
                        stages[si] = { ...stage, options };
                        update("stages", stages);
                      }} /> Best</label>
                      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={opt.isCriticalFailure} onChange={(e) => {
                        const stages = [...sim.stages];
                        const options = [...stage.options];
                        options[oi] = { ...opt, isCriticalFailure: e.target.checked };
                        stages[si] = { ...stage, options };
                        update("stages", stages);
                      }} /> Critical failure</label>
                    </div>
                    <Input value={opt.feedback} onChange={(e) => {
                      const stages = [...sim.stages];
                      const options = [...stage.options];
                      options[oi] = { ...opt, feedback: e.target.value };
                      stages[si] = { ...stage, options };
                      update("stages", stages);
                    }} placeholder="Feedback" />
                    <Input value={opt.consequence} onChange={(e) => {
                      const stages = [...sim.stages];
                      const options = [...stage.options];
                      options[oi] = { ...opt, consequence: e.target.value };
                      stages[si] = { ...stage, options };
                      update("stages", stages);
                    }} placeholder="Consequence" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={() => update("stages", [...sim.stages, emptyStage(sim.id, sim.stages.length + 1)])}>
            Add stage
          </Button>
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle>Scoring</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Competency weights total: {weightSum}% {Math.abs(weightSum - 100) > 0.5 && "(should be 100%)"}</p>
            {sim.assessedCompetencyIds.map((id) => (
              <div key={id} className="flex items-center gap-3">
                <span className="w-40 text-sm">{data.competencies.find((c) => c.id === id)?.name}</span>
                <Input
                  type="number"
                  className="w-28"
                  value={sim.competencyWeights[id] ?? 0}
                  onChange={(e) =>
                    update("competencyWeights", { ...sim.competencyWeights, [id]: Number(e.target.value) })
                  }
                />
              </div>
            ))}
            <div><Label>Passing score</Label><Input type="number" value={sim.passingScore} onChange={(e) => update("passingScore", Number(e.target.value))} /></div>
            <div><Label>Critical-failure behaviours</Label><Textarea value={sim.criticalFailureBehaviours.join("\n")} onChange={(e) => update("criticalFailureBehaviours", e.target.value.split("\n").filter(Boolean))} /></div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Performance bands: Ready 85–100 · Nearly Ready 70–84 · Development Needed 50–69 · High Support below 50
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader><CardTitle>Preview as employee</CardTitle></CardHeader>
          <CardContent>
            <SimulationPlayer simulation={sim} preview modeLabel="Admin preview" />
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardHeader><CardTitle>Publish</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Save as draft to continue editing, or publish to make the simulation available for assignments.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => persist("draft")}>Save as draft</Button>
              <Button onClick={() => persist("published")}>Publish</Button>
              <Button variant="secondary" onClick={() => { persist("published"); window.location.href = "/admin/assignments"; }}>
                Publish and assign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
        <Button disabled={step === STEPS.length - 1} onClick={() => setStep((s) => s + 1)}>Next</Button>
      </div>
      {step < 5 && (
        <div>
          <Progress value={((step + 1) / STEPS.length) * 100} />
        </div>
      )}
    </div>
  );
}
