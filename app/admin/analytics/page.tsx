"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page";
import { MetricTip } from "@/components/metrics/metric-tip";
import { getData } from "@/lib/data/store";
import type { AppData } from "@/lib/types";
import { average, formatPercent } from "@/lib/utils";
import {
  completionRate,
  criticalErrorRate,
  improvementPercentage,
} from "@/lib/scoring";

type Tab = "workforce" | "team" | "comparison" | "competency" | "effectiveness";

export default function AnalyticsPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [tab, setTab] = useState<Tab>("workforce");
  const [selected, setSelected] = useState<string[]>(["ep_1", "ep_2", "ep_4", "ep_demo"]);

  useEffect(() => {
    const d = getData();
    setData(d);
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "comparison") setTab("comparison");
  }, []);

  const metrics = useMemo(() => {
    if (!data) return null;
    const completedAsg = data.assignments.filter((a) => a.status === "completed").length;
    const attempts = data.attempts.filter((a) => a.status === "completed");
    const firstScores = data.employeeProfiles.map((ep) => {
      const first = attempts.filter((a) => a.employeeId === ep.id).sort((a, b) => a.attemptNumber - b.attemptNumber)[0];
      return first?.overallScore;
    }).filter((n): n is number => typeof n === "number");
    const latestScores = data.employeeProfiles.map((e) => e.readinessScore);
    const withRetry = data.employeeProfiles.filter((ep) => attempts.filter((a) => a.employeeId === ep.id).length > 1).length;
    const started = data.employeeProfiles.filter((ep) => attempts.some((a) => a.employeeId === ep.id)).length;
    return {
      completion: completionRate(completedAsg, data.assignments.length),
      firstAttempt: average(firstScores),
      latestAttempt: average(latestScores),
      improvement: average(
        data.employeeProfiles.map((ep) => {
          const emp = attempts.filter((a) => a.employeeId === ep.id).sort((a, b) => a.attemptNumber - b.attemptNumber);
          if (emp.length < 2) return null;
          return improvementPercentage(emp[0].overallScore ?? 0, emp[emp.length - 1].overallScore ?? 0);
        }).filter((n): n is number => n !== null)
      ),
      avgReadiness: average(latestScores),
      passRate: completionRate(attempts.filter((a) => (a.overallScore ?? 0) >= 70).length, attempts.length),
      retryRate: started ? (withRetry / started) * 100 : 0,
      timeToCompletion: average(attempts.map((a) => a.timeSpentMinutes)),
      critical: criticalErrorRate(attempts.filter((a) => a.hasCriticalFailure).length, attempts.length),
      feedbackEngagement: attempts.length
        ? (data.feedbackReports.length / attempts.length) * 100
        : 0,
    };
  }, [data]);

  const teamData = useMemo(() => {
    if (!data) return [];
    return data.departments.map((d) => ({
      name: d.name,
      readiness: Math.round(average(data.employeeProfiles.filter((e) => e.departmentId === d.id).map((e) => e.readinessScore)) || 0),
      completion: Math.round(
        average(
          data.employeeProfiles
            .filter((e) => e.departmentId === d.id)
            .map((e) => {
              const asgs = data.assignments.filter((a) => a.employeeIds.includes(e.id));
              const done = asgs.filter((a) =>
                data.attempts.some((t) => t.assignmentId === a.id && t.employeeId === e.id && t.status === "completed")
              ).length;
              return asgs.length ? (done / asgs.length) * 100 : 0;
            })
        ) || 0
      ),
    }));
  }, [data]);

  const comparison = useMemo(() => {
    if (!data) return null;
    const people = selected
      .map((id) => data.employeeProfiles.find((e) => e.id === id))
      .filter(Boolean)
      .slice(0, 4) as AppData["employeeProfiles"];
    const radarKeys = data.competencies.slice(0, 5);
    const radar = radarKeys.map((c) => {
      const row: Record<string, string | number> = { competency: c.name };
      for (const ep of people) {
        const user = data.users.find((u) => u.id === ep.userId)!;
        const latest = data.attempts
          .filter((a) => a.employeeId === ep.id && a.status === "completed")
          .sort((a, b) => b.attemptNumber - a.attemptNumber)[0];
        row[user.name] = latest?.competencyScores.find((cs) => cs.competencyId === c.id)?.score ?? ep.readinessScore * 0.8;
      }
      return row;
    });
    const bars = people.map((ep) => {
      const user = data.users.find((u) => u.id === ep.userId)!;
      const attempts = data.attempts.filter((a) => a.employeeId === ep.id && a.status === "completed").sort((a, b) => a.attemptNumber - b.attemptNumber);
      return {
        name: user.name,
        readiness: ep.readinessScore,
        attempts: attempts.length,
        improvement:
          attempts.length >= 2
            ? Math.round(improvementPercentage(attempts[0].overallScore ?? 0, attempts[attempts.length - 1].overallScore ?? 0))
            : Math.round(ep.readinessScore - ep.previousScore),
        time: Math.round(average(attempts.map((a) => a.timeSpentMinutes)) || 0),
        critical: attempts.filter((a) => a.hasCriticalFailure).length,
      };
    });
    return { people, radar, bars, names: bars.map((b) => b.name) };
  }, [data, selected]);

  const effectiveness = useMemo(() => {
    if (!data) return [];
    return data.simulations.map((sim) => {
      const asgs = data.assignments.filter((a) => a.simulationId === sim.id);
      const attempts = data.attempts.filter((a) => a.simulationId === sim.id && a.status === "completed");
      const assignedCount = new Set(asgs.flatMap((a) => a.employeeIds)).size;
      const completedLearners = new Set(attempts.map((a) => a.employeeId)).size;
      const improvements = [...new Set(attempts.map((a) => a.employeeId))].map((eid) => {
        const emp = attempts.filter((a) => a.employeeId === eid).sort((a, b) => a.attemptNumber - b.attemptNumber);
        if (emp.length < 2) return null;
        return (emp[emp.length - 1].overallScore ?? 0) > (emp[0].overallScore ?? 0);
      });
      const improving = improvements.filter(Boolean).length;
      const considered = improvements.filter((x) => x !== null).length;
      // Find most difficult stage approx by lowest avg option selection score if responses exist
      let hardest = sim.stages[0]?.title ?? "—";
      let wrong = "—";
      for (const stage of sim.stages) {
        const worst = [...stage.options].sort((a, b) => a.score - b.score)[0];
        if (worst && !worst.isBest) {
          hardest = stage.title;
          wrong = worst.text.slice(0, 80);
          break;
        }
      }
      const gapComps = attempts.flatMap((a) => a.competencyScores).sort((a, b) => b.gap - a.gap);
      const topGap = gapComps[0]
        ? data.competencies.find((c) => c.id === gapComps[0].competencyId)?.name
        : "—";
      return {
        id: sim.id,
        title: sim.title,
        assigned: assignedCount,
        completion: assignedCount ? (completedLearners / assignedCount) * 100 : 0,
        avgScore: average(attempts.map((a) => a.overallScore ?? 0)),
        avgImprovement: average(
          [...new Set(attempts.map((a) => a.employeeId))]
            .map((eid) => {
              const emp = attempts.filter((a) => a.employeeId === eid).sort((a, b) => a.attemptNumber - b.attemptNumber);
              if (emp.length < 2) return null;
              return improvementPercentage(emp[0].overallScore ?? 0, emp[emp.length - 1].overallScore ?? 0);
            })
            .filter((n): n is number => n !== null)
        ),
        hardest,
        wrong,
        topGap,
        improvingPct: considered ? (improving / considered) * 100 : 0,
      };
    });
  }, [data]);

  if (!data || !metrics) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "workforce", label: "Workforce overview" },
    { id: "team", label: "Team comparison" },
    { id: "comparison", label: "Employee comparison" },
    { id: "competency", label: "Competency analysis" },
    { id: "effectiveness", label: "Simulation effectiveness" },
  ];

  const colors = ["#00E5FF", "#34D399", "#FBBF24", "#F87171"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Workforce, team, and simulation performance insights"
      />

      <Card className="border-cyan-500/20 bg-slate-950 text-white">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
          <div>
            <CardDescription className="mb-1 text-[11px] font-semibold tracking-wider text-cyan-300 uppercase">
              Experience · Skills intelligence
            </CardDescription>
            <CardTitle className="text-white">AI Assessment analytics</CardTitle>
            <CardDescription className="mt-1 text-white/55">
              Cohort heatmaps, individual evidence, and deploy-next recommendations.
            </CardDescription>
          </div>
          <Button asChild className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
            <Link href="/admin/assessments/assess_mall_shampoo/analytics">
              Open shampoo cohort <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-1">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="workforce">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            ["completionRate", "Completion rate", formatPercent(metrics.completion)],
            ["firstAttemptScore", "First-attempt score", Math.round(metrics.firstAttempt)],
            ["latestAttemptScore", "Latest-attempt score", Math.round(metrics.latestAttempt)],
            ["improvementPercentage", "Score improvement", formatPercent(metrics.improvement)],
            ["averageReadiness", "Average readiness", Math.round(metrics.avgReadiness)],
            ["passRate", "Pass rate", formatPercent(metrics.passRate)],
            ["retryRate", "Retry rate", formatPercent(metrics.retryRate)],
            ["timeToCompletion", "Time to completion", `${Math.round(metrics.timeToCompletion)} min`],
            ["criticalErrorRate", "Critical-error rate", formatPercent(metrics.critical)],
            ["feedbackEngagement", "Feedback engagement", formatPercent(metrics.feedbackEngagement)],
          ].map(([tip, label, value]) => (
            <Card key={label as string}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  <MetricTip metricKey={tip as string} label={label as string} />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tracking-tight text-navy">{value}</CardContent>
            </Card>
          ))}
        </div>
        </TabsContent>

        <TabsContent value="team">
        <Card>
          <CardHeader><CardTitle>Team comparison by department</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="readiness" fill="#00E5FF" name="Readiness" />
                <Bar dataKey="completion" fill="#34D399" name="Completion %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="comparison">
        {comparison && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Select 2–4 employees</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {data.employeeProfiles.map((ep) => {
                const user = data.users.find((u) => u.id === ep.userId)!;
                const active = selected.includes(ep.id);
                return (
                  <button
                    key={ep.id}
                    onClick={() =>
                      setSelected((prev) =>
                        active ? prev.filter((id) => id !== ep.id) : prev.length >= 4 ? prev : [...prev, ep.id]
                      )
                    }
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${active ? "border-primary bg-secondary shadow-sm" : "border-border hover:bg-muted"}`}
                  >
                    {user.name}
                  </button>
                );
              })}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {comparison.bars.map((b) => (
              <Card key={b.name}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{b.name}</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div>Readiness <Badge>{b.readiness}</Badge></div>
                  <div>Attempts {b.attempts}</div>
                  <div>Improvement {b.improvement}%</div>
                  <div>Time {b.time} min</div>
                  <div>Critical errors {b.critical}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Readiness comparison</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparison.bars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="readiness" fill="#00E5FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Competency radar</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={comparison.radar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="competency" tick={{ fontSize: 10 }} />
                    {comparison.names.map((name, i) => (
                      <Radar key={name} name={name} dataKey={name} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.15} />
                    ))}
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Detailed comparison</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 pr-3">Employee</th>
                    <th className="py-2 pr-3">Readiness</th>
                    <th className="py-2 pr-3">Attempts</th>
                    <th className="py-2 pr-3">Improvement %</th>
                    <th className="py-2 pr-3">Time (min)</th>
                    <th className="py-2 pr-3">Critical errors</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.bars.map((b) => (
                    <tr key={b.name} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium">{b.name}</td>
                      <td className="py-2 pr-3">{b.readiness}</td>
                      <td className="py-2 pr-3">{b.attempts}</td>
                      <td className="py-2 pr-3">{b.improvement}</td>
                      <td className="py-2 pr-3">{b.time}</td>
                      <td className="py-2 pr-3">{b.critical}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                Comparison is intended to support coaching and workforce planning. It should not be used as the sole basis for employment decisions.
              </p>
            </CardContent>
          </Card>
        </div>
        )}
        </TabsContent>

        <TabsContent value="competency">
        <Card>
          <CardHeader><CardTitle>Competency gaps across completed attempts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.competencies.map((c) => {
              const gaps = data.attempts
                .flatMap((a) => a.competencyScores)
                .filter((cs) => cs.competencyId === c.id && cs.gap > 0)
                .map((cs) => cs.gap);
              return (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{c.name}</span>
                  <Badge variant="warning">Avg gap {Math.round(average(gaps) || 0)}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="effectiveness">
        <div className="space-y-4">
          {effectiveness.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle className="text-base">{e.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div>Assigned: <strong>{e.assigned}</strong></div>
                <div>Completion: <strong>{formatPercent(e.completion)}</strong></div>
                <div>Avg score: <strong>{Math.round(e.avgScore || 0)}</strong></div>
                <div>Avg improvement: <strong>{formatPercent(e.avgImprovement || 0)}</strong></div>
                <div className="md:col-span-2">Most difficult stage: <strong>{e.hardest}</strong></div>
                <div className="md:col-span-2">Frequent incorrect response: <strong>{e.wrong}</strong></div>
                <div>Largest competency gap: <strong>{e.topGap}</strong></div>
                <div>% improving after feedback: <strong>{formatPercent(e.improvingPct)}</strong></div>
              </CardContent>
            </Card>
          ))}
        </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
