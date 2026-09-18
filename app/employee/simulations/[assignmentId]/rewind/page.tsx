"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getData,
  getEmployeeProfileIdForUser,
  getRewindReplaysForAttempt,
  getSession,
  saveRewindReplay,
} from "@/lib/data/store";
import { identifyCriticalMoments } from "@/lib/rewind/critical-moments";
import type { AppData, RewindReplay } from "@/lib/types";
import { cn } from "@/lib/utils";

function RewindInner() {
  const params = useParams<{ assignmentId: string }>();
  const search = useSearchParams();
  const attemptId = search.get("attemptId") ?? "";
  const stageId = search.get("stageId") ?? "";

  const [data, setData] = useState<AppData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [replay, setReplay] = useState<RewindReplay | null>(null);

  useEffect(() => {
    const d = getData();
    setData(d);
    const session = getSession();
    if (session) setEmployeeId(getEmployeeProfileIdForUser(session.userId) ?? null);
  }, []);

  const view = useMemo(() => {
    if (!data || !employeeId || !attemptId || !stageId) return null;
    const attempt = data.attempts.find(
      (a) =>
        a.id === attemptId &&
        a.assignmentId === params.assignmentId &&
        a.employeeId === employeeId &&
        a.status === "completed"
    );
    if (!attempt) return null;
    const simulation = data.simulations.find((s) => s.id === attempt.simulationId);
    if (!simulation) return null;
    const names = Object.fromEntries(data.competencies.map((c) => [c.id, c.name]));
    const moments = identifyCriticalMoments({ simulation, attempt, competencyNames: names });
    const moment = moments.find((m) => m.stageId === stageId);
    const stage = simulation.stages.find((s) => s.id === stageId);
    if (!moment || !stage) return null;
    const existing = getRewindReplaysForAttempt(attemptId).find((r) => r.stageId === stageId) ?? null;
    return { attempt, simulation, moment, stage, names, existing };
  }, [data, employeeId, attemptId, stageId, params.assignmentId]);

  useEffect(() => {
    if (view?.existing) setReplay(view.existing);
  }, [view?.existing]);

  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  if (!view) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Rewind moment not found for this attempt.</p>
        <Button asChild variant="outline">
          <Link href={`/employee/simulations/${params.assignmentId}/results`}>Back to results</Link>
        </Button>
      </div>
    );
  }

  const { attempt, moment, stage, names } = view;

  function submitReplay() {
    if (!selected) return;
    try {
      const saved = saveRewindReplay({
        attemptId: attempt.id,
        stageId: moment.stageId,
        revisedOptionId: selected,
      });
      setReplay(saved);
      setData(getData());
      toast.success("Replay saved — compare your scores below");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save replay");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#00E5FF] uppercase">
            Rewind &amp; Replay
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">{moment.stageTitle}</h1>
          <p className="mt-1 text-sm text-white/50">Stage {moment.stageOrder} · Try a different response</p>
        </div>
        <Button asChild variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/5">
          <Link href={`/employee/simulations/${params.assignmentId}/results?attemptId=${attemptId}`}>
            <ArrowLeft className="h-4 w-4" /> Results
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Why this moment matters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="leading-relaxed text-white/70">{moment.impactSummary}</p>
          <div className="flex flex-wrap gap-1.5">
            {moment.affectedCompetencyIds.map((id) => (
              <Badge key={id} variant="outline">
                {names[id] ?? id}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex gap-3 rounded-lg border border-white/10 bg-secondary/30 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {moment.characterName}{" "}
                <span className="font-normal text-white/45">· {moment.characterRole}</span>
              </div>
              <p className="mt-1 text-sm text-white/75">{moment.characterMessage}</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm">
            <div className="mb-1 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
              Your original response
            </div>
            <p className="text-white/80">
              <span className="mr-1 font-semibold text-[#00E5FF]">{moment.originalLabel}.</span>
              {moment.originalText}
            </p>
            <p className="mt-2 text-xs text-white/45">
              <span className="font-medium text-white/60">Impact then:</span> {moment.originalConsequence}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-white">{moment.decisionPrompt}</h3>
            {!replay ? (
              <div className="space-y-2">
                {stage.options.map((opt) => {
                  const isOriginal = opt.id === moment.originalOptionId;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelected(opt.id)}
                      className={cn(
                        "w-full rounded-md border px-3 py-3 text-left text-sm transition-colors",
                        selected === opt.id
                          ? "border-[#00E5FF]/50 bg-[#00E5FF]/10"
                          : "border-white/10 hover:bg-white/5",
                        isOriginal && "opacity-70"
                      )}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#00E5FF]">{opt.label}.</span>
                        {isOriginal && (
                          <Badge variant="outline" className="text-[10px]">
                            Original
                          </Badge>
                        )}
                        {opt.isBest && (
                          <Badge className="border-0 bg-emerald-500/15 text-emerald-300 text-[10px]">
                            Stronger choice
                          </Badge>
                        )}
                      </div>
                      {opt.text}
                    </button>
                  );
                })}
                <Button className="mt-3" disabled={!selected || selected === moment.originalOptionId} onClick={submitReplay}>
                  <RotateCcw className="h-4 w-4" /> See how the character reacts
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                    <div className="mb-1 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                      Original reaction
                    </div>
                    <p className="text-white/70">{replay.originalConsequence}</p>
                  </div>
                  <div className="rounded-lg border border-[#00E5FF]/30 bg-[#00E5FF]/10 p-3 text-sm">
                    <div className="mb-1 text-[11px] font-semibold tracking-wider text-[#00E5FF] uppercase">
                      Revised reaction
                    </div>
                    <p className="text-white/85">{replay.revisedConsequence}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 p-4">
                  <h4 className="text-sm font-semibold text-white">Score comparison</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-white/5 px-3 py-3 text-center">
                      <div className="text-[11px] text-white/45 uppercase">Original overall</div>
                      <div className="mt-1 text-2xl font-semibold text-white">{replay.originalOverallScore}%</div>
                    </div>
                    <div className="rounded-lg bg-[#00E5FF]/10 px-3 py-3 text-center">
                      <div className="text-[11px] text-[#7dd3fc] uppercase">Revised overall</div>
                      <div className="mt-1 text-2xl font-semibold text-[#00E5FF]">{replay.revisedOverallScore}%</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {replay.revisedCompetencyScores.map((rev) => {
                      const orig =
                        replay.originalCompetencyScores.find((c) => c.competencyId === rev.competencyId)?.score ??
                        0;
                      const d = rev.score - orig;
                      return (
                        <div
                          key={rev.competencyId}
                          className="flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2 text-sm"
                        >
                          <span className="text-white/75">{names[rev.competencyId] ?? rev.competencyId}</span>
                          <span className="tabular-nums text-white/80">
                            {orig}% → {rev.score}%{" "}
                            <span className={d >= 0 ? "text-emerald-300" : "text-risk"}>
                              ({d >= 0 ? "+" : ""}
                              {d})
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="border-white/15 bg-transparent text-white hover:bg-white/5"
                    onClick={() => {
                      setReplay(null);
                      setSelected(null);
                    }}
                  >
                    Try another response
                  </Button>
                  <Button asChild>
                    <Link href={`/employee/simulations/${params.assignmentId}/results?attemptId=${attemptId}`}>
                      Back to results
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RewindPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
      <RewindInner />
    </Suspense>
  );
}
