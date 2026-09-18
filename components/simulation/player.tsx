"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import type { Simulation, SimulationAttempt } from "@/lib/types";
import { startOrResumeAttempt, submitStageResponse } from "@/lib/data/store";

export function SimulationPlayer({
  simulation,
  assignmentId,
  employeeId,
  preview = false,
  modeLabel,
}: {
  simulation: Simulation;
  assignmentId?: string;
  employeeId?: string;
  preview?: boolean;
  modeLabel?: string;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<SimulationAttempt | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [consequence, setConsequence] = useState<string | null>(null);
  const [started, setStarted] = useState(preview);

  const stage =
    simulation.stages.length > 0
      ? simulation.stages[Math.min(stageIndex, simulation.stages.length - 1)]
      : undefined;
  const progress = simulation.stages.length
    ? ((stageIndex + (consequence ? 1 : 0)) / simulation.stages.length) * 100
    : 0;

  const policyText = useMemo(
    () => stage?.policyReference || simulation.policies.join(" · "),
    [stage, simulation.policies]
  );

  if (!simulation.stages.length) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm text-muted-foreground">
          This simulation has no stages yet. Add stages in the Build step before previewing.
        </CardContent>
      </Card>
    );
  }

  function begin() {
    if (preview) {
      setStarted(true);
      setStageIndex(0);
      setSelected(null);
      setConsequence(null);
      return;
    }
    if (!assignmentId || !employeeId) return;
    const att = startOrResumeAttempt(assignmentId, employeeId);
    setAttempt(att);
    setStageIndex(att.currentStageIndex);
    setStarted(true);
  }

  function submit() {
    if (!selected || !stage) return;
    if (preview) {
      const opt = stage.options.find((o) => o.id === selected)!;
      setConsequence(opt.consequence);
      toast.message("Preview decision recorded");
      return;
    }
    if (!attempt) return;
    const result = submitStageResponse({
      attemptId: attempt.id,
      stageId: stage.id,
      optionId: selected,
    });
    setAttempt(result.attempt);
    setConsequence(result.consequence);
    if (result.completed && assignmentId) {
      toast.success("Simulation completed");
      router.push(`/employee/simulations/${assignmentId}/results?attemptId=${result.attempt.id}`);
    }
  }

  function nextStage() {
    setConsequence(null);
    setSelected(null);
    setStageIndex((i) => i + 1);
  }

  if (!started) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{simulation.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{simulation.scenarioContext}</p>
          <p className="text-sm"><span className="font-medium">Your responsibility:</span> {simulation.employeeResponsibility}</p>
          <Button onClick={begin}>Start simulation</Button>
        </CardContent>
      </Card>
    );
  }

  if (!stage) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Stage {stageIndex + 1} of {simulation.stages.length}
          {modeLabel ? ` · ${modeLabel}` : ""}
        </div>
        <Badge variant="outline">{simulation.difficulty}</Badge>
      </div>
      <Progress value={progress} />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{stage.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{stage.situation}</p>
            <div className="flex gap-3 rounded-lg border border-border bg-secondary/40 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-navy">
                  {stage.characterName}{" "}
                  <span className="font-normal text-muted-foreground">· {stage.characterRole}</span>
                </div>
                <p className="mt-1 text-sm">{stage.characterMessage}</p>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">{stage.decisionPrompt}</h3>
              {!consequence && (
                <div className="space-y-2">
                  {stage.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelected(opt.id)}
                      className={`w-full rounded-md border px-3 py-3 text-left text-sm transition-colors ${
                        selected === opt.id ? "border-primary bg-secondary" : "border-border hover:bg-muted"
                      }`}
                    >
                      <span className="mr-2 font-semibold text-primary">{opt.label}.</span>
                      {opt.text}
                    </button>
                  ))}
                </div>
              )}
              {consequence && (
                <div className="rounded-md border border-primary/20 bg-secondary p-4 text-sm">
                  <div className="mb-1 font-semibold text-navy">Consequence</div>
                  <p>{consequence}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Scores stay hidden until the final results screen.</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!consequence ? (
                <Button disabled={!selected} onClick={submit}>Submit response</Button>
              ) : stageIndex < simulation.stages.length - 1 ? (
                <Button onClick={nextStage}>Continue</Button>
              ) : preview ? (
                <Button variant="outline" onClick={() => { setStarted(false); setStageIndex(0); setConsequence(null); setSelected(null); }}>
                  Restart preview
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4" /> Policy / reference
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>{policyText || "No additional policy notes for this stage."}</p>
            <ul className="list-disc space-y-1 pl-4">
              {simulation.constraints.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
