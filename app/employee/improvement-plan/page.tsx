"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { Sparkles } from "lucide-react";
import { getData, getEmployeeProfileIdForUser, getSession } from "@/lib/data/store";
import type { AppData } from "@/lib/types";

export default function EmployeeImprovementPlanPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  useEffect(() => {
    setData(getData());
    const s = getSession();
    if (s) setEmployeeId(getEmployeeProfileIdForUser(s.userId) ?? null);
  }, []);

  const plan = useMemo(() => {
    if (!data || !employeeId) return null;
    return data.improvementPlans
      .filter((p) => p.employeeId === employeeId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }, [data, employeeId]);

  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  if (!plan) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No improvement plan yet"
        description="Complete a simulation to generate a personalised coaching plan."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Improvement Plan</h1>
        <p className="text-sm text-muted-foreground">{plan.title}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            {plan.summary}
            {plan.aiGenerated && <Badge variant="secondary">AI-generated recommendation</Badge>}
            <Badge variant="outline">{plan.status.replaceAll("_", " ")}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.actions.map((a) => (
            <div key={a.id} className="rounded-md border border-border p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-navy">{a.skillToImprove}</div>
                <Badge>{a.status.replaceAll("_", " ")}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground"><span className="font-medium text-foreground">Evidence:</span> {a.evidence}</p>
              <p className="mt-1"><span className="font-medium">Recommended action:</span> {a.recommendedAction}</p>
              <p className="mt-1"><span className="font-medium">Practice activity:</span> {a.practiceActivity}</p>
              <p className="mt-1"><span className="font-medium">Success measure:</span> {a.successMeasure}</p>
              <p className="mt-1 text-xs text-muted-foreground">Review by {new Date(a.reviewDate).toLocaleDateString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
