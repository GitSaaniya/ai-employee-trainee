"use client";

import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricTip } from "@/components/metrics/metric-tip";
import { getData, getEmployeeProfileIdForUser, getSession } from "@/lib/data/store";
import type { AppData } from "@/lib/types";
import { average } from "@/lib/utils";
import { improvementPercentage } from "@/lib/scoring";

export default function PerformancePage() {
  const [data, setData] = useState<AppData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  useEffect(() => {
    setData(getData());
    const s = getSession();
    if (s) setEmployeeId(getEmployeeProfileIdForUser(s.userId) ?? null);
  }, []);

  const view = useMemo(() => {
    if (!data || !employeeId) return null;
    const ep = data.employeeProfiles.find((e) => e.id === employeeId)!;
    const attempts = data.attempts
      .filter((a) => a.employeeId === employeeId && a.status === "completed")
      .sort((a, b) => a.attemptNumber - b.attemptNumber);
    const first = attempts[0]?.overallScore ?? ep.previousScore;
    const latest = attempts[attempts.length - 1]?.overallScore ?? ep.readinessScore;
    const roleBench = average(data.employeeProfiles.filter((e) => e.roleId === ep.roleId).map((e) => e.readinessScore));
    const personalBest = Math.max(...attempts.map((a) => a.overallScore ?? 0), ep.readinessScore);
    const trend = attempts.map((a) => ({ name: `Attempt ${a.attemptNumber}`, score: a.overallScore ?? 0 }));
    const latestAttempt = attempts[attempts.length - 1];
    const comps =
      latestAttempt?.competencyScores.map((cs) => ({
        name: data.competencies.find((c) => c.id === cs.competencyId)?.name ?? cs.competencyId,
        score: cs.score,
      })) ?? [];
    return { ep, attempts, first, latest, roleBench, personalBest, trend, comps, improvement: improvementPercentage(first, latest) };
  }, [data, employeeId]);

  if (!data || !view) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">My Performance</h1>
        <p className="text-sm text-muted-foreground">Readiness, history, and practice focus areas</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm"><MetricTip metricKey="readinessScore" label="Current readiness" /></CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{view.latest}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Previous score</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{view.first}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm"><MetricTip metricKey="improvementPercentage" label="Improvement" /></CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{Math.round(view.improvement)}%</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Personal best</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{view.personalBest}</CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Competency trend</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={view.trend.length ? view.trend : [{ name: "Now", score: view.latest }]}>
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
          <CardHeader><CardTitle>Areas needing practice</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view.comps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#00E5FF" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Attempt history · Role benchmark {Math.round(view.roleBench)}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {view.attempts.map((a) => (
            <div key={a.id} className="flex justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span>{data.simulations.find((s) => s.id === a.simulationId)?.title} · Attempt {a.attemptNumber}</span>
              <Badge>{a.overallScore}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
