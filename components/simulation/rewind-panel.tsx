"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RewindCriticalMoment, RewindReplay } from "@/lib/types";
import { cn } from "@/lib/utils";

const severityStyle: Record<RewindCriticalMoment["severity"], string> = {
  critical: "border-risk/40 bg-risk/10 text-risk",
  high: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  medium: "border-[#00E5FF]/25 bg-[#00E5FF]/10 text-[#7dd3fc]",
};

export function RewindReplayPanel({
  moments,
  replays,
  assignmentId,
  attemptId,
  competencyNames,
}: {
  moments: RewindCriticalMoment[];
  replays: RewindReplay[];
  assignmentId: string;
  attemptId: string;
  competencyNames: Record<string, string>;
}) {
  if (!moments.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4 text-[#00E5FF]" />
            Rewind &amp; Replay
          </CardTitle>
          <CardDescription>
            No pivotal miss-steps detected on this attempt. Strong work — keep practicing to stay sharp.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-[#00E5FF]/20">
      <CardHeader className="border-b border-white/10 bg-[#00E5FF]/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-[#00E5FF]" />
              Rewind &amp; Replay
            </CardTitle>
            <CardDescription className="mt-1.5 max-w-2xl">
              We found {moments.length} critical moment{moments.length === 1 ? "" : "s"} where your response changed
              the outcome. Rewind, try a different choice, and compare competency scores.
            </CardDescription>
          </div>
          <Badge className="border-0 bg-[#00E5FF]/15 text-[#00E5FF]">{moments.length} moments</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5">
        {moments.map((moment, index) => {
          const replay = replays.find((r) => r.stageId === moment.stageId);
          const delta =
            replay != null ? replay.revisedOverallScore - replay.originalOverallScore : null;
          return (
            <div
              key={moment.stageId}
              className="rounded-xl border border-white/10 bg-black/20 p-4 transition-colors hover:border-[#00E5FF]/25"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                      Moment {index + 1}
                    </span>
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        severityStyle[moment.severity]
                      )}
                    >
                      {moment.severity}
                    </span>
                    <span className="text-xs text-white/40">Stage {moment.stageOrder}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{moment.stageTitle}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{moment.impactSummary}</p>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50">
                    <span className="font-medium text-white/70">You said:</span> {moment.originalText}
                  </div>
                  {moment.affectedCompetencyIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {moment.affectedCompetencyIds.map((id) => (
                        <Badge key={id} variant="outline" className="text-[10px] text-white/60">
                          {competencyNames[id] ?? id}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {replay && (
                    <p className="text-xs text-[#00E5FF]">
                      Replayed · Overall {replay.originalOverallScore}% → {replay.revisedOverallScore}%
                      {delta != null && delta !== 0
                        ? ` (${delta > 0 ? "+" : ""}${delta})`
                        : ""}
                    </p>
                  )}
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link
                    href={`/employee/simulations/${assignmentId}/rewind?attemptId=${attemptId}&stageId=${moment.stageId}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {replay ? "Replay again" : "Rewind"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
