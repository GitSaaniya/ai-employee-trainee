"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, Star, Target, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { MetricTip } from "@/components/metrics/metric-tip";
import type { AppData } from "@/lib/types";
import { getData } from "@/lib/data/store";
import {
  average,
  formatPercent,
  formatScore,
} from "@/lib/utils";
import {
  completionRate,
  detectConsecutiveNonImproving,
  getPerformanceBand,
  improvementPercentage,
  needsSupport,
  performanceBandLabel,
} from "@/lib/scoring";

const BAND_COLORS: Record<string, string> = {
  Ready: "#16A34A",
  "Nearly Ready": "#00E5FF",
  "Development Needed": "#F59E0B",
  "High Support Required": "#DC2626",
};

export default function AdminOverviewPage() {
  const [data, setDataState] = useState<AppData | null>(null);

  useEffect(() => {
    setDataState(getData());
  }, []);

  const metrics = useMemo(() => {
    if (!data) return null;
    const employees = data.employeeProfiles;
    const totalEmployees = employees.length;
    const assignedSims = data.assignments.length;

    let assignmentSlots = 0;
    let completedSlots = 0;
    for (const asg of data.assignments) {
      for (const eid of asg.employeeIds) {
        assignmentSlots += 1;
        const done = data.attempts.some(
          (a) => a.assignmentId === asg.id && a.employeeId === eid && a.status === "completed"
        );
        if (done) completedSlots += 1;
      }
    }
    const completion = completionRate(completedSlots, assignmentSlots);
    const avgReadiness = average(employees.map((e) => e.readinessScore));

    const needing = employees.filter((ep) => {
      const attempts = data.attempts.filter((a) => a.employeeId === ep.id);
      const hasCritical = attempts.some((a) => a.hasCriticalFailure);
      return needsSupport({
        readinessScore: ep.readinessScore,
        hasCriticalFailure: hasCritical,
        consecutiveNonImproving: detectConsecutiveNonImproving(attempts),
      });
    });

    const improvements = employees
      .map((ep) => {
        const completed = data.attempts
          .filter((a) => a.employeeId === ep.id && a.status === "completed" && typeof a.overallScore === "number")
          .sort(
            (a, b) =>
              new Date(a.completedAt || a.createdAt).getTime() -
              new Date(b.completedAt || b.createdAt).getTime()
          );
        if (completed.length < 2) return null;
        return improvementPercentage(completed[0].overallScore!, completed[completed.length - 1].overallScore!);
      })
      .filter((v): v is number => v !== null);
    const avgImprovement = average(improvements);

    const bandCounts: Record<string, number> = {
      Ready: 0,
      "Nearly Ready": 0,
      "Development Needed": 0,
      "High Support Required": 0,
    };
    for (const ep of employees) {
      const label = performanceBandLabel(getPerformanceBand(ep.readinessScore));
      bandCounts[label] = (bandCounts[label] ?? 0) + 1;
    }
    const bandPie = Object.entries(bandCounts).map(([name, value]) => ({ name, value }));

    const deptMap = new Map<string, { name: string; scores: number[] }>();
    for (const ep of employees) {
      const dept = data.departments.find((d) => d.id === ep.departmentId);
      const name = dept?.name ?? "Unknown";
      if (!deptMap.has(ep.departmentId)) deptMap.set(ep.departmentId, { name, scores: [] });
      deptMap.get(ep.departmentId)!.scores.push(ep.readinessScore);
    }
    const readinessByDept = [...deptMap.values()].map((d) => ({
      name: d.name.replace(" Banking", "").replace(" Management", ""),
      readiness: Math.round(average(d.scores)),
    }));

    const completedAttempts = data.attempts
      .filter((a) => a.status === "completed" && a.completedAt)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

    const byDay = new Map<string, number[]>();
    for (const a of completedAttempts) {
      const day = a.completedAt!.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(a.overallScore ?? 0);
    }
    const trend = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([day, scores]) => ({
        day: day.slice(5),
        score: Math.round(average(scores)),
      }));

    const attention = needing
      .map((ep) => {
        const user = data.users.find((u) => u.id === ep.userId);
        const role = data.roles.find((r) => r.id === ep.roleId);
        return {
          id: ep.id,
          name: user?.name ?? "Unknown",
          role: role?.name ?? "—",
          readiness: ep.readinessScore,
          risk: ep.riskLevel,
        };
      })
      .sort((a, b) => a.readiness - b.readiness)
      .slice(0, 6);

    const recent = completedAttempts
      .slice()
      .reverse()
      .slice(0, 5)
      .map((a) => {
        const user = data.users.find(
          (u) => u.id === data.employeeProfiles.find((e) => e.id === a.employeeId)?.userId
        );
        const sim = data.simulations.find((s) => s.id === a.simulationId);
        return {
          id: a.id,
          name: user?.name ?? "Unknown",
          sim: sim?.title ?? "Simulation",
          score: a.overallScore ?? 0,
          band: a.performanceBand ? performanceBandLabel(a.performanceBand) : "—",
          at: a.completedAt!,
        };
      });

    const activeAssignments = data.assignments
      .filter((a) => a.status === "in_progress" || a.status === "not_started" || a.status === "overdue")
      .slice(0, 5);

    const actions: { title: string; detail: string; href: string }[] = [];
    if (needing.length > 0) {
      actions.push({
        title: `Review ${needing.length} employee${needing.length === 1 ? "" : "s"} needing support`,
        detail: "Open profiles, assign targeted practice, and approve improvement plans.",
        href: "/admin/employees",
      });
    }
    const overdue = data.assignments.filter((a) => a.status === "overdue");
    if (overdue.length > 0) {
      actions.push({
        title: `Follow up on ${overdue.length} overdue assignment${overdue.length === 1 ? "" : "s"}`,
        detail: "Reassign or extend due dates before scores drift further.",
        href: "/admin/assignments",
      });
    }
    const pendingPlans = data.improvementPlans.filter((p) => p.status === "pending_review" || p.status === "draft");
    if (pendingPlans.length > 0) {
      actions.push({
        title: `Approve ${pendingPlans.length} improvement plan${pendingPlans.length === 1 ? "" : "s"}`,
        detail: "Coach actions stay draft until an admin reviews them.",
        href: "/admin/improvement-plans",
      });
    }
    if (actions.length === 0) {
      actions.push({
        title: "Workforce readiness looks healthy",
        detail: "Continue assigning published simulations to keep practice momentum.",
        href: "/admin/assignments",
      });
    }

    return {
      totalEmployees,
      assignedSims,
      completion,
      avgReadiness,
      needingCount: needing.length,
      avgImprovement,
      bandPie,
      readinessByDept,
      trend,
      attention,
      recent,
      activeAssignments,
      actions,
    };
  }, [data]);

  if (!data || !metrics) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce overview"
        description={`Organisation readiness for ${data.organisation.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/experience">
                <Star className="h-4 w-4" /> Experience
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/simulations/sim_hv_alert">
                Open BFSI simulation <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <Card className="border-primary/20 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
          <div>
            <CardDescription className="mb-1 text-[11px] font-semibold tracking-wider text-cyan-300 uppercase">
              4E · Experience
            </CardDescription>
            <CardTitle className="text-lg text-white">KNOLSKAPE AI Assessment</CardTitle>
            <CardDescription className="mt-1 max-w-xl text-white/55">
              Author video interviews by role — start with the FMCG Mall Floor Shampoo Pitch template.
            </CardDescription>
          </div>
          <Button
            asChild
            className="border-0 bg-gradient-to-r from-blue-600 to-cyan-400 text-white hover:opacity-95"
          >
            <Link href="/admin/experience">
              Open Experience <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          label={<MetricTip metricKey="employeesRequiringSupport" label="Total employees" />}
          value={String(metrics.totalEmployees)}
          icon={Users}
        />
        <MetricCard
          label="Assigned simulations"
          value={String(metrics.assignedSims)}
          icon={ClipboardList}
        />
        <MetricCard
          label={<MetricTip metricKey="completionRate" label="Completion rate" />}
          value={formatPercent(metrics.completion)}
          icon={CheckCircle2}
        />
        <MetricCard
          label={<MetricTip metricKey="averageReadiness" label="Avg readiness" />}
          value={formatScore(metrics.avgReadiness)}
          icon={Target}
        />
        <MetricCard
          label={<MetricTip metricKey="employeesRequiringSupport" label="Needing support" />}
          value={String(metrics.needingCount)}
          icon={AlertTriangle}
          accent={metrics.needingCount > 0 ? "risk" : undefined}
        />
        <MetricCard
          label={<MetricTip metricKey="averageScoreImprovement" label="Avg improvement" />}
          value={formatPercent(metrics.avgImprovement)}
          icon={Target}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Readiness bands</CardTitle>
            <CardDescription>Distribution across the workforce</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.bandPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {metrics.bandPie.map((entry) => (
                    <Cell key={entry.name} fill={BAND_COLORS[entry.name] ?? "#00E5FF"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Readiness by department</CardTitle>
            <CardDescription>Average latest readiness score</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.readinessByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="readiness" fill="#00E5FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Score trend</CardTitle>
            <CardDescription>Average completed attempt scores</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#00E5FF" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Employees needing attention</CardTitle>
              <CardDescription>Flagged by readiness, critical failures, or stalled progress</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/employees">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.attention.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees currently flagged for support.</p>
            ) : (
              metrics.attention.map((row) => (
                <Link
                  key={row.id}
                  href={`/admin/employees/${row.id}`}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted/60"
                >
                  <div>
                    <div className="text-sm font-medium text-navy">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.role}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={row.risk === "critical" || row.risk === "high" ? "risk" : "warning"}>
                      {row.risk}
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums">{formatScore(row.readiness)}</span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent completions</CardTitle>
            <CardDescription>Latest finished simulation attempts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.recent.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-navy">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.sim}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{formatScore(row.score)}</div>
                  <div className="text-xs text-muted-foreground">{row.band}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active assignments</CardTitle>
              <CardDescription>In progress, not started, or overdue</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/assignments">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.activeAssignments.map((asg) => (
              <div key={asg.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-navy">{asg.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {asg.employeeIds.length} learners · due {asg.dueDate.slice(0, 10)}
                  </div>
                </div>
                <Badge
                  variant={
                    asg.status === "overdue" ? "risk" : asg.status === "in_progress" ? "default" : "outline"
                  }
                >
                  {asg.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended actions</CardTitle>
            <CardDescription>Next steps based on current readiness signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.actions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-3 hover:bg-muted/60"
              >
                <div>
                  <div className="text-sm font-medium text-navy">{action.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{action.detail}</div>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: React.ReactNode;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "risk";
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${accent === "risk" ? "text-risk" : "text-navy"}`}>
            {value}
          </div>
        </div>
        <div className={`rounded-lg p-2.5 ${accent === "risk" ? "bg-risk/10 text-risk" : "bg-secondary text-primary"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
