"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { ClipboardList } from "lucide-react";
import { getData, getEmployeeProfileIdForUser, getSession } from "@/lib/data/store";
import type { AppData } from "@/lib/types";

export default function TrainingPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  useEffect(() => {
    setData(getData());
    const s = getSession();
    if (s) setEmployeeId(getEmployeeProfileIdForUser(s.userId) ?? null);
  }, []);

  const rows = useMemo(() => {
    if (!data || !employeeId) return [];
    return data.assignments.filter((a) => a.employeeIds.includes(employeeId));
  }, [data, employeeId]);

  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Assigned Training</h1>
        <p className="text-sm text-muted-foreground">Simulations assigned to you</p>
      </div>
      {!rows.length ? (
        <EmptyState icon={ClipboardList} title="No assignments" description="Your administrator has not assigned training yet." />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const sim = data.simulations.find((s) => s.id === a.simulationId);
            return (
              <Card key={a.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{sim?.title}</p>
                  </div>
                  <Badge variant={a.status === "overdue" ? "risk" : "outline"}>{a.status.replaceAll("_", " ")}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">Due {new Date(a.dueDate).toLocaleDateString()} · Pass {a.passingScore}</div>
                  <Button asChild size="sm"><Link href={`/employee/simulations/${a.id}`}>Open</Link></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
