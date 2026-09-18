"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { approveImprovementPlan, getData, updateImprovementPlan } from "@/lib/data/store";
import type { AppData, ImprovementPlan } from "@/lib/types";

export default function ImprovementPlansAdminPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [editing, setEditing] = useState<ImprovementPlan | null>(null);

  useEffect(() => setData(getData()), []);

  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  function approve(id: string) {
    approveImprovementPlan(id);
    toast.success("Plan approved and activated");
    setData(getData());
  }

  function saveEdit() {
    if (!editing) return;
    updateImprovementPlan(editing);
    toast.success("Plan updated");
    setEditing(null);
    setData(getData());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Improvement Plans</h1>
        <p className="text-sm text-muted-foreground">Review AI-generated recommendations before assigning them as active coaching plans</p>
      </div>
      <div className="space-y-4">
        {data.improvementPlans.map((plan) => {
          const user = data.users.find((u) => u.id === data.employeeProfiles.find((e) => e.id === plan.employeeId)?.userId);
          return (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {plan.title}
                  {plan.aiGenerated && <Badge variant="secondary">AI-generated recommendation</Badge>}
                  <Badge variant="outline">{plan.status.replaceAll("_", " ")}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{user?.name} · {plan.summary}</p>
                {plan.actions.map((a) => (
                  <div key={a.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="font-medium">{a.skillToImprove}</div>
                    <p className="text-muted-foreground">{a.evidence}</p>
                    <p>{a.recommendedAction}</p>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  {!plan.reviewedByAdmin && (
                    <Button size="sm" onClick={() => approve(plan.id)}>Approve plan</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditing(plan)}>Edit summary</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Card>
          <CardHeader><CardTitle>Edit plan summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
            <div className="flex gap-2">
              <Button onClick={saveEdit}>Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
