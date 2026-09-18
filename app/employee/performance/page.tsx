"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricTip } from "@/components/metrics/metric-tip";
import { getData, getEmployeeProfileIdForUser, getSession } from "@/lib/data/store";
import type { AppData } from "@/lib/types";
import { average } from "@/lib/utils";
import { getPerformanceBand, improvementPercentage, performanceBandLabel } from "@/lib/scoring";

type PerformanceEntry = {
  id: string;
  kind: "assessment" | "simulation";
  title: string;
  score: number;
  at: string;
  label: string;
  href?: string;
  skills: { name: string; score: number }[];
};

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
    const ep = data.employeeProfiles.find((e) => e.id === employeeId);
    if (!ep) return null;

    const assessmentEntries: PerformanceEntry[] = data.assessmentResults
      .filter((r) => r.employeeId === employeeId)
      .map((r) => {
        const assessment = data.assessments.find((a) => a.id === r.assessmentId);
        return {
          id: r.id,
          kind: "assessment" as const,
          title: assessment?.title ?? "AI Assessment",
          score: Math.round(r.overallScore),
          at: r.scoredAt,
          label: assessment?.roleLabel ? `${assessment.title} · ${assessment.roleLabel}` : (assessment?.title ?? "AI Assessment"),
          href: `/employee/assessments/${r.assignmentId}/results`,
          skills: r.skillScores.map((s) => ({ name: s.name, score: Math.round(s.score) })),
        };
      });

    const simulationEntries: PerformanceEntry[] = data.attempts
      .filter((a) => a.employeeId === employeeId && a.status === "completed" && typeof a.overallScore === "number")
      .map((a) => {
        const sim = data.simulations.find((s) => s.id === a.simulationId);
        return {
          id: a.id,
          kind: "simulation" as const,
          title: sim?.title ?? "Simulation",
          score: Math.round(a.overallScore ?? 0),
          at: a.completedAt ?? a.updatedAt,
          label: `${sim?.title ?? "Simulation"} · Attempt ${a.attemptNumber}`,
          href: `/employee/simulations/${a.assignmentId}/results`,
          skills: (a.competencyScores ?? []).map((cs) => ({
            name: data.competencies.find((c) => c.id === cs.competencyId)?.name ?? cs.competencyId,
            score: Math.round(cs.score),
          })),
        };
      });

    const performances = [...assessmentEntries, ...simulationEntries].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    );

    const scores = performances.map((p) => p.score);
    const latest = scores.length ? scores[scores.length - 1]! : ep.readinessScore;
    const previous =
      scores.length >= 2 ? scores[scores.length - 2]! : ep.previousScore;
    const personalBest = scores.length ? Math.max(...scores) : ep.readinessScore;
    const roleBench = average(
      data.employeeProfiles.filter((e) => e.roleId === ep.roleId).map((e) => e.readinessScore)
    );

    const trend = performances.map((p, i) => ({
      name: performances.length <= 6 ? p.title.slice(0, 18) : `#${i + 1}`,
      score: p.score,
      full: p.label,
    }));

    const latestWithSkills = [...performances].reverse().find((p) => p.skills.length > 0);
    const comps = latestWithSkills
      ? [...latestWithSkills.skills].sort((a, b) => a.score - b.score)
      : [];

    const history = [...performances].reverse();

    return {
      ep,
      performances,
      history,
      latest,
      previous,
      personalBest,
      roleBench,
      trend,
      comps,
      improvement: improvementPercentage(previous || 0, latest),
      hasData: performances.length > 0,
    };
  }, [data, employeeId]);

  if (!data || !view) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  const band = getPerformanceBand(view.latest);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">My Performance</h1>
        <p className="text-sm text-muted-foreground">
          Readiness from your AI assessments and simulation attempts
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              <MetricTip metricKey="readinessScore" label="Current readiness" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{view.latest}</div>
            {view.hasData && (
              <Badge className="mt-2" variant="secondary">
                {performanceBandLabel(band)}
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Previous score</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{view.previous}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              <MetricTip metricKey="improvementPercentage" label="Improvement" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {view.hasData ? `${Math.round(view.improvement)}%` : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Personal best</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{view.personalBest}</CardContent>
        </Card>
      </div>

      {!view.hasData ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-10">
            <p className="text-sm text-muted-foreground">
              No completed performances yet. Finish an AI assessment to see readiness, skill gaps, and history here.
            </p>
            <Button asChild>
              <Link href="/employee/assessments">Go to AI Assessment</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Competency trend</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={view.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value) => [value, "Score"]}
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as { full?: string } | undefined;
                        return row?.full ?? "";
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#00E5FF" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Areas needing practice</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                {view.comps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skill breakdown on your latest result.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={view.comps} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#00E5FF" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Performance history · Role benchmark {Math.round(view.roleBench)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {view.history.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    {p.href ? (
                      <Link href={p.href} className="truncate font-medium hover:underline">
                        {p.label}
                      </Link>
                    ) : (
                      <span className="truncate font-medium">{p.label}</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {p.kind === "assessment" ? "AI Assessment" : "Simulation"} ·{" "}
                      {new Date(p.at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge>{p.score}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
