"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Mic, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import {
  getData,
  getEmployeeProfileIdForUser,
  getResultForAssignment,
  getSession,
} from "@/lib/data/store";
import type { AppData } from "@/lib/types";

export default function EmployeeAssessmentsPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const d = getData();
    setData(d);
    const session = getSession();
    if (session) setEmployeeId(getEmployeeProfileIdForUser(session.userId) ?? null);
  }, []);

  const rows = useMemo(() => {
    if (!data || !employeeId) return [];
    return data.assessmentAssignments
      .filter((a) => a.employeeId === employeeId)
      .map((asg) => {
        const assessment = data.assessments.find((x) => x.id === asg.assessmentId);
        const result = getResultForAssignment(asg.id, employeeId);
        return { asg, assessment, result };
      })
      .filter((r) => r.assessment);
  }, [data, employeeId]);

  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assessment"
        description="Video interviews assigned by your admin — Experience layer of the 4E framework."
      />

      {rows.length === 0 ? (
        <Card className="overflow-hidden border-[#00E5FF]/20 bg-gradient-to-br from-slate-900 to-slate-950 text-white">
          <CardHeader>
            <Badge className="mb-2 w-fit border-transparent bg-[#00E5FF]/15 text-[#00E5FF]">
              No assignments
            </Badge>
            <CardTitle className="text-xl text-white">Nothing assigned yet</CardTitle>
            <CardDescription className="text-white/55">
              When your CHRO publishes an AI Assessment, it will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map(({ asg, assessment, result }) => (
            <Card key={asg.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge>{asg.status.replace("_", " ")}</Badge>
                    <Badge variant="outline">{assessment!.domain}</Badge>
                    {result && <Badge variant="success">{result.overallScore}% ready</Badge>}
                  </div>
                  <CardTitle>{assessment!.title}</CardTitle>
                  <CardDescription className="mt-1 max-w-xl">
                    {assessment!.goal} · Due {new Date(asg.dueAt).toLocaleDateString()} ·{" "}
                    {assessment!.durationMinutes} min
                  </CardDescription>
                </div>
                {asg.status === "completed" && result ? (
                  <Button asChild>
                    <Link href={`/employee/assessments/${asg.id}/results`}>
                      View summary <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href={`/employee/assessments/${asg.id}`}>
                      Start interview <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
                  <Video className="h-3.5 w-3.5" /> Camera preview
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
                  <Mic className="h-3.5 w-3.5" /> Voice interview
                </div>
                <div className="text-xs text-muted-foreground">
                  Interviewer: {assessment!.persona.name} · {assessment!.persona.style}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meanwhile</CardTitle>
          <CardDescription>Continue your existing simulation training.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/employee/training">
              Go to Assigned Training <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
