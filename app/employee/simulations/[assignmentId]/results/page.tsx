"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RewindReplayPanel } from "@/components/simulation/rewind-panel";
import {
  getData,
  getEmployeeProfileIdForUser,
  getRewindReplaysForAttempt,
  getSession,
} from "@/lib/data/store";
import { identifyCriticalMoments } from "@/lib/rewind/critical-moments";
import type { AppData } from "@/lib/types";
import { performanceBandLabel } from "@/lib/scoring";

function ResultsInner() {
  const params = useParams<{ assignmentId: string }>();
  const search = useSearchParams();
  const [data, setData] = useState<AppData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    setData(getData());
    const session = getSession();
    if (session) setEmployeeId(getEmployeeProfileIdForUser(session.userId) ?? null);
  }, []);

  const view = useMemo(() => {
    if (!data || !employeeId) return null;
    const attemptId = search.get("attemptId");
    const attempts = data.attempts
      .filter(
        (a) =>
          a.assignmentId === params.assignmentId &&
          a.employeeId === employeeId &&
          a.status === "completed"
      )
      .sort((a, b) => b.attemptNumber - a.attemptNumber);
    const attempt = (attemptId && attempts.find((a) => a.id === attemptId)) || attempts[0];
    if (!attempt) return null;
    const feedback = data.feedbackReports.find((f) => f.attemptId === attempt.id);
    const plan = data.improvementPlans.find((p) => p.attemptId === attempt.id);
    const simulation = data.simulations.find((s) => s.id === attempt.simulationId);
    const competencyNames = Object.fromEntries(data.competencies.map((c) => [c.id, c.name]));
    const moments =
      simulation != null
        ? identifyCriticalMoments({ simulation, attempt, competencyNames })
        : [];
    const replays = getRewindReplaysForAttempt(attempt.id);
    return { attempt, feedback, plan, simulation, moments, replays, competencyNames };
  }, [data, employeeId, params.assignmentId, search]);

  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  if (!view) return <div className="text-sm text-muted-foreground">No completed attempt found yet.</div>;

  const { attempt, feedback, plan, simulation, moments, replays, competencyNames } = view;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Results & feedback</h1>
        <p className="text-sm text-muted-foreground">{simulation?.title}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Overall readiness</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{attempt.overallScore}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Performance band</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{performanceBandLabel(attempt.performanceBand!)}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Critical errors</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {attempt.hasCriticalFailure ? "Yes" : "None"}
          </CardContent>
        </Card>
      </div>

      <RewindReplayPanel
        moments={moments}
        replays={replays}
        assignmentId={params.assignmentId}
        attemptId={attempt.id}
        competencyNames={competencyNames}
      />

      <Card>
        <CardHeader>
          <CardTitle>Competency breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {attempt.competencyScores.map((cs) => (
            <div
              key={cs.competencyId}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>{data.competencies.find((c) => c.id === cs.competencyId)?.name}</span>
              <span>
                {cs.score} <span className="text-muted-foreground">(req {cs.required})</span>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {feedback && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Strong decisions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {feedback.strongDecisions.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
              {!feedback.strongDecisions.length && (
                <p className="text-muted-foreground">Focus on best-option selections next time.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Missed opportunities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {feedback.missedOpportunities.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Specific feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {feedback.specificFeedback.map((s, i) => (
                <p key={i} className="rounded-md bg-muted px-3 py-2">
                  {s}
                </p>
              ))}
              {feedback.criticalErrors.length > 0 && (
                <div className="rounded-md border border-risk/30 bg-risk/5 p-3">
                  <div className="mb-1 font-medium text-risk">Critical errors</div>
                  {feedback.criticalErrors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground">
                Recommended next practice: {feedback.recommendedNextPractice}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {plan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Personal improvement plan
              {plan.aiGenerated && <Badge variant="secondary">AI-generated recommendation</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{plan.summary}</p>
            {plan.actions.map((a) => (
              <div key={a.id} className="rounded-md border border-border p-3 text-sm">
                <div className="font-medium">{a.skillToImprove}</div>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-navy">Evidence:</span> {a.evidence}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Action:</span> {a.recommendedAction}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Practice:</span> {a.practiceActivity}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Success measure:</span> {a.successMeasure}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={`/employee/simulations/${params.assignmentId}`}>Retry simulation</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/employee/performance">View detailed report</Link>
        </Button>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
      <ResultsInner />
    </Suspense>
  );
}
