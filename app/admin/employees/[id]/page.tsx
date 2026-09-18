"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import { MetricTip } from "@/components/metrics/metric-tip";
import type { AppData } from "@/lib/types";
import {
  assignTargetedPractice,
  competencyNameMap,
  getData,
} from "@/lib/data/store";
import { formatPercent, formatScore } from "@/lib/utils";
import {
  detectConsecutiveNonImproving,
  getPerformanceBand,
  improvementPercentage,
  needsSupport,
  performanceBandLabel,
} from "@/lib/scoring";

export default function AdminEmployeeProfilePage() {
  const params = useParams<{ id: string }>();
  const [data, setDataState] = useState<AppData | null>(null);
  const [simId, setSimId] = useState("");

  function reload() {
    const d = getData();
    setDataState(d);
    if (!simId && d.simulations[0]) setSimId(d.simulations.find((s) => s.status === "published")?.id ?? d.simulations[0].id);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = useMemo(() => {
    if (!data) return null;
    const ep = data.employeeProfiles.find((e) => e.id === params.id);
    if (!ep) return null;
    const user = data.users.find((u) => u.id === ep.userId);
    const role = data.roles.find((r) => r.id === ep.roleId);
    const dept = data.departments.find((d) => d.id === ep.departmentId);
    const names = competencyNameMap(data);
    const attempts = data.attempts
      .filter((a) => a.employeeId === ep.id)
      .sort(
        (a, b) =>
          new Date(a.completedAt || a.createdAt).getTime() -
          new Date(b.completedAt || b.createdAt).getTime()
      );
    const completed = attempts.filter((a) => a.status === "completed" && typeof a.overallScore === "number");
    const latest = completed[completed.length - 1];
    const first = completed[0];
    const improvement =
      first && latest && completed.length >= 2
        ? improvementPercentage(first.overallScore!, latest.overallScore!)
        : 0;
    const support = needsSupport({
      readinessScore: ep.readinessScore,
      hasCriticalFailure: attempts.some((a) => a.hasCriticalFailure),
      consecutiveNonImproving: detectConsecutiveNonImproving(attempts),
    });
    const band = getPerformanceBand(ep.readinessScore);
    const scoreTrend = completed.map((a, i) => ({
      attempt: `A${i + 1}`,
      score: a.overallScore ?? 0,
    }));
    const competencyBars = (latest?.competencyScores ?? []).map((cs) => ({
      name: names[cs.competencyId] ?? cs.competencyId,
      score: cs.score,
      required: cs.required,
      gap: cs.gap,
    }));
    const assignments = data.assignments.filter((a) => a.employeeIds.includes(ep.id));
    const plans = data.improvementPlans.filter((p) => p.employeeId === ep.id);
    const feedback = data.feedbackReports.filter((f) => f.employeeId === ep.id);

    return {
      ep,
      user,
      role,
      dept,
      band,
      bandLabel: performanceBandLabel(band),
      support,
      improvement,
      scoreTrend,
      competencyBars,
      assignments,
      plans,
      feedback,
      completedCount: completed.length,
      names,
    };
  }, [data, params.id]);

  function handleAssignPractice() {
    if (!profile || !simId) return;
    try {
      assignTargetedPractice(profile.ep.id, simId);
      toast.success("Targeted practice assigned");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign practice");
    }
  }

  if (!data) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/employees">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Employee profile not found.</p>
      </div>
    );
  }

  const publishedSims = data.simulations.filter((s) => s.status === "published" || s.status === "draft");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/admin/employees">
              <ArrowLeft className="h-4 w-4" />
              Employees
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-navy">{profile.user?.name ?? "Employee"}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.role?.name} · {profile.dept?.name} · {profile.user?.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              profile.band === "ready"
                ? "success"
                : profile.band === "nearly_ready"
                  ? "default"
                  : profile.band === "development_needed"
                    ? "warning"
                    : "risk"
            }
          >
            {profile.bandLabel}
          </Badge>
          <Badge variant={profile.ep.riskLevel === "low" ? "success" : profile.ep.riskLevel === "medium" ? "warning" : "risk"}>
            Risk: {profile.ep.riskLevel}
          </Badge>
          {profile.support && <Badge variant="risk">Needs support</Badge>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">
              <MetricTip metricKey="readinessScore" label="Readiness score" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-navy">
              {formatScore(profile.ep.readinessScore)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Previous {formatScore(profile.ep.previousScore)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">
              <MetricTip metricKey="improvementPercentage" label="Improvement" />
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-navy">
              {formatPercent(profile.improvement)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{profile.completedCount} completed attempts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Assignments</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-navy">
              {profile.assignments.length}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {profile.plans.length} improvement plan{profile.plans.length === 1 ? "" : "s"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-muted-foreground">Last activity</div>
            <div className="mt-2 text-lg font-semibold text-navy">
              {profile.ep.lastActivityAt.slice(0, 10)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Score history</CardTitle>
            <CardDescription>Completed attempt scores over time</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {profile.scoreTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed attempts yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profile.scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="attempt" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#00E5FF" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competency profile</CardTitle>
            <CardDescription>Latest attempt vs required proficiency</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {profile.competencyBars.length === 0 ? (
              <p className="text-sm text-muted-foreground">No competency scores available yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profile.competencyBars} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#00E5FF" name="Score" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="required" fill="#CBD5E1" name="Required" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign targeted practice</CardTitle>
          <CardDescription>
            Create a focused assignment for this employee from an existing simulation.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <label className="text-sm font-medium text-navy">Simulation</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={simId}
              onChange={(e) => setSimId(e.target.value)}
            >
              {publishedSims.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleAssignPractice}>
            <Target className="h-4 w-4" />
            Assign targeted practice
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments.</p>
            ) : (
              profile.assignments.map((asg) => (
                <div key={asg.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium text-navy">{asg.title}</div>
                    <Badge variant="outline">{asg.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Due {asg.dueDate.slice(0, 10)} · pass {asg.passingScore}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competency gaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.competencyBars.length === 0 ? (
              <p className="text-sm text-muted-foreground">Complete a simulation to see gaps.</p>
            ) : (
              profile.competencyBars.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-navy">{c.name}</span>
                    <span className="text-muted-foreground">
                      {c.score} / {c.required}
                      {c.gap > 0 ? ` · gap ${c.gap}` : ""}
                    </span>
                  </div>
                  <Progress value={c.score} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {profile.feedback[0] && (
        <Card>
          <CardHeader>
            <CardTitle>Latest feedback highlights</CardTitle>
            <CardDescription>From the most recent completed attempt</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</h4>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                {profile.feedback[profile.feedback.length - 1].strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Development areas
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                {profile.feedback[profile.feedback.length - 1].developmentAreas.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
