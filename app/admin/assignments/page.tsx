"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AppData, Assignment } from "@/lib/types";
import { createAssignment, getData } from "@/lib/data/store";

type AssigneeType = Assignment["assigneeType"];

export default function AdminAssignmentsPage() {
  const [data, setDataState] = useState<AppData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [simulationId, setSimulationId] = useState("");
  const [assigneeType, setAssigneeType] = useState<AssigneeType>("individual");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [passingScore, setPassingScore] = useState(70);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [instructions, setInstructions] = useState("");

  function reload() {
    const d = getData();
    setDataState(d);
    if (!simulationId && d.simulations[0]) {
      setSimulationId(d.simulations[0].id);
    }
    if (!dueDate) {
      const dte = new Date();
      dte.setDate(dte.getDate() + 14);
      setDueDate(dte.toISOString().slice(0, 10));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const optionList = useMemo(() => {
    if (!data) return [];
    if (assigneeType === "individual") {
      return data.employeeProfiles.map((ep) => {
        const user = data.users.find((u) => u.id === ep.userId);
        return { id: ep.id, label: user?.name ?? ep.id };
      });
    }
    if (assigneeType === "department") {
      return data.departments.map((d) => ({ id: d.id, label: d.name }));
    }
    if (assigneeType === "role") {
      return data.roles.map((r) => ({ id: r.id, label: r.name }));
    }
    // team — treat as multi individual for MVP
    return data.employeeProfiles.map((ep) => {
      const user = data.users.find((u) => u.id === ep.userId);
      return { id: ep.id, label: user?.name ?? ep.id };
    });
  }, [data, assigneeType]);

  function resolveEmployeeIds(type: AssigneeType, ids: string[], source: AppData): string[] {
    if (type === "individual" || type === "team") return ids;
    if (type === "department") {
      return source.employeeProfiles.filter((ep) => ids.includes(ep.departmentId)).map((ep) => ep.id);
    }
    if (type === "role") {
      return source.employeeProfiles.filter((ep) => ids.includes(ep.roleId)).map((ep) => ep.id);
    }
    return [];
  }

  function toggleId(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    if (!title.trim() || !simulationId || selectedIds.length === 0 || !dueDate) {
      toast.error("Fill in title, simulation, assignees, and due date");
      return;
    }
    const employeeIds = resolveEmployeeIds(assigneeType, selectedIds, data);
    if (employeeIds.length === 0) {
      toast.error("No employees match the selected assignees");
      return;
    }
    createAssignment({
      organisationId: data.organisation.id,
      simulationId,
      title: title.trim(),
      assigneeType,
      assigneeIds: selectedIds,
      employeeIds,
      dueDate: new Date(dueDate).toISOString(),
      passingScore,
      allowMultipleAttempts: allowMultiple,
      maxAttempts: allowMultiple ? maxAttempts : 1,
      instructions: instructions.trim() || "Complete the assigned simulation before the due date.",
      status: "not_started",
    });
    toast.success(`Assignment created for ${employeeIds.length} learner${employeeIds.length === 1 ? "" : "s"}`);
    setShowForm(false);
    setTitle("");
    setSelectedIds([]);
    setInstructions("");
    reload();
  }

  if (!data) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Assignments</h1>
          <p className="text-sm text-muted-foreground">
            Assign simulations to individuals, departments, or roles with due dates and pass scores.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v);
            setSelectedIds([]);
          }}
        >
          <Plus className="h-4 w-4" />
          New assignment
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create assignment</CardTitle>
            <CardDescription>Learners inherit the assignment based on your targeting rules.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onCreate}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Q3 Branch Manager readiness check"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="simulationId">Simulation</Label>
                  <select
                    id="simulationId"
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                    value={simulationId}
                    onChange={(e) => setSimulationId(e.target.value)}
                  >
                    {data.simulations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assigneeType">Assign to</Label>
                  <select
                    id="assigneeType"
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                    value={assigneeType}
                    onChange={(e) => {
                      setAssigneeType(e.target.value as AssigneeType);
                      setSelectedIds([]);
                    }}
                  >
                    <option value="individual">Individuals</option>
                    <option value="team">Team (multi-select)</option>
                    <option value="department">Department</option>
                    <option value="role">Role</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">Due date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passingScore">Passing score</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    min={0}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Multiple attempts</Label>
                  <div className="flex h-10 items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={allowMultiple}
                        onChange={(e) => setAllowMultiple(e.target.checked)}
                      />
                      Allow retries
                    </label>
                    {allowMultiple && (
                      <Input
                        className="w-24"
                        type="number"
                        min={2}
                        max={10}
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(Number(e.target.value))}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Assignees</Label>
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-3">
                    {optionList.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(opt.id)}
                          onChange={() => toggleId(opt.id)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="instructions">Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Explain focus areas, policies to review, and attempt expectations."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create assignment</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {data.assignments.map((asg) => {
          const sim = data.simulations.find((s) => s.id === asg.simulationId);
          let completed = 0;
          for (const eid of asg.employeeIds) {
            if (
              data.attempts.some(
                (a) => a.assignmentId === asg.id && a.employeeId === eid && a.status === "completed"
              )
            ) {
              completed += 1;
            }
          }
          return (
            <Card key={asg.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>{asg.title}</CardTitle>
                  <CardDescription>
                    {sim?.title ?? "Simulation"} · {asg.assigneeType} · due {asg.dueDate.slice(0, 10)}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    asg.status === "completed"
                      ? "success"
                      : asg.status === "overdue"
                        ? "risk"
                        : asg.status === "in_progress"
                          ? "default"
                          : "outline"
                  }
                >
                  {asg.status.replace("_", " ")}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-xs uppercase tracking-wide">Learners</div>
                  <div className="mt-0.5 font-medium text-navy">
                    {completed}/{asg.employeeIds.length} completed
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide">Passing score</div>
                  <div className="mt-0.5 font-medium text-navy">{asg.passingScore}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide">Attempts</div>
                  <div className="mt-0.5 font-medium text-navy">
                    {asg.allowMultipleAttempts
                      ? `Up to ${asg.maxAttempts ?? "∞"}`
                      : "Single attempt"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide">Instructions</div>
                  <div className="mt-0.5 line-clamp-2 text-navy">{asg.instructions}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
