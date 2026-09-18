"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { getData, getEmployeeProfileIdForUser, getSession } from "@/lib/data/store";
import type { AppData } from "@/lib/types";
import { getPerformanceBand, performanceBandLabel } from "@/lib/scoring";

export default function EmployeeDashboard() {
  const [data, setData] = useState<AppData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const d = getData();
    setData(d);
    const session = getSession();
    if (session) setEmployeeId(getEmployeeProfileIdForUser(session.userId) ?? null);
  }, []);

  const view = useMemo(() => {
    if (!data || !employeeId) return null;
    const ep = data.employeeProfiles.find((e) => e.id === employeeId)!;
    const user = data.users.find((u) => u.id === ep.userId)!;
    const assignments = data.assignments.filter((a) => a.employeeIds.includes(employeeId));
    const upcoming = [...assignments]
      .filter((a) => a.status !== "completed")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const attempts = data.attempts
      .filter((a) => a.employeeId === employeeId && a.status === "completed")
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
    const latest = attempts[attempts.length - 1];
    const comps =
      latest?.competencyScores.map((cs) => ({
        name: data.competencies.find((c) => c.id === cs.competencyId)?.name ?? cs.competencyId,
        score: cs.score,
        gap: cs.gap,
      })) ?? [];
    const strengths = [...comps].sort((a, b) => b.score - a.score).slice(0, 3);
    const gaps = [...comps].filter((c) => c.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 3);
    const trend = attempts.map((a) => ({ name: `A${a.attemptNumber}`, score: a.overallScore ?? 0 }));
    const continueAsg = upcoming[0] ?? assignments[0];
    return { ep, user, assignments, upcoming, attempts, strengths, gaps, trend, continueAsg };
  }, [data, employeeId]);

  if (!data || !view) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  const band = getPerformanceBand(view.ep.readinessScore);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${view.user.name}`}
        description="Track readiness and continue your assigned training"
        actions={
          view.continueAsg ? (
            <Button asChild size="lg">
              <Link href={`/employee/simulations/${view.continueAsg.id}`}>
                Continue Training <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Current readiness</CardTitle></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{view.ep.readinessScore}</div>
            <Badge className="mt-2">{performanceBandLabel(band)}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Assigned simulations</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{view.assignments.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Upcoming deadline</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">
            {view.upcoming[0] ? new Date(view.upcoming[0].dueDate).toLocaleDateString() : "None"}
          </CardContent>
        </Card>
      </div>

      <Card className="border-cyan-500/20 bg-slate-950 text-white">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
          <div>
            <CardDescription className="mb-1 text-cyan-300/90">Experience · AI Assessment</CardDescription>
            <CardTitle className="text-white">Video interview practice</CardTitle>
            <CardDescription className="mt-1 text-white/55">
              Complete assigned AI Assessments with camera and microphone when your admin publishes them.
            </CardDescription>
          </div>
          <Button asChild className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
            <Link href="/employee/assessments">
              Open AI Assessment <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Improvement trend</CardTitle></CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={view.trend.length ? view.trend : [{ name: "Now", score: view.ep.readinessScore }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#00E5FF" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recommended next action</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {view.continueAsg
                ? `Continue “${view.continueAsg.title}” and focus on explaining verification before committing to outcomes.`
                : "No open assignments. Browse practice scenarios to maintain readiness."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 font-medium">Strengths</div>
                {view.strengths.map((s) => <div key={s.name}>{s.name}</div>)}
              </div>
              <div>
                <div className="mb-1 font-medium">Development areas</div>
                {view.gaps.map((s) => <div key={s.name}>{s.name}</div>)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
