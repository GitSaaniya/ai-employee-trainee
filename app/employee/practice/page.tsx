"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getData, getEmployeeProfileIdForUser, getSession } from "@/lib/data/store";
import type { AppData } from "@/lib/types";

export default function PracticePage() {
  const [data, setData] = useState<AppData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  useEffect(() => {
    setData(getData());
    const s = getSession();
    if (s) setEmployeeId(getEmployeeProfileIdForUser(s.userId) ?? null);
  }, []);

  const items = useMemo(() => {
    if (!data || !employeeId) return [];
    return data.assignments
      .filter((a) => a.employeeIds.includes(employeeId) && a.allowMultipleAttempts)
      .map((a) => ({
        assignment: a,
        simulation: data.simulations.find((s) => s.id === a.simulationId),
        attempts: data.attempts.filter((t) => t.assignmentId === a.id && t.employeeId === employeeId && t.status === "completed").length,
      }));
  }, [data, employeeId]);

  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Practice</h1>
        <p className="text-sm text-muted-foreground">Retry allowed simulations to improve readiness</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(({ assignment, simulation, attempts }) => (
          <Card key={assignment.id}>
            <CardHeader>
              <CardTitle className="text-base">{simulation?.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{attempts} completed attempt{attempts === 1 ? "" : "s"}</p>
              <Button asChild size="sm"><Link href={`/employee/simulations/${assignment.id}`}>Practice again</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
