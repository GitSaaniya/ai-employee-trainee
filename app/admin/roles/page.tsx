"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/misc";
import type { AppData, RoleFormValues } from "@/lib/types";
import { RoleFormSchema } from "@/lib/types";
import { getData, upsertRole, competencyNameMap } from "@/lib/data/store";
import { uid } from "@/lib/utils";

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AdminRolesPage() {
  const [data, setDataState] = useState<AppData | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(RoleFormSchema),
    defaultValues: {
      name: "",
      departmentId: "",
      description: "",
      seniorityLevel: "Associate",
      competencies: [
        {
          competencyId: "",
          weight: 25,
          expectedProficiency: 80,
          observableBehaviours: "",
          commonMistakes: "",
          businessOutcomes: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "competencies",
  });

  function reload() {
    setDataState(getData());
  }

  useEffect(() => {
    reload();
  }, []);

  const names = useMemo(() => (data ? competencyNameMap(data) : {}), [data]);

  const weightSum = form.watch("competencies")?.reduce((s, c) => s + (Number(c.weight) || 0), 0) ?? 0;

  function startCreate() {
    setEditingId(null);
    setShowForm(true);
    form.reset({
      name: "",
      departmentId: data?.departments[0]?.id ?? "",
      description: "",
      seniorityLevel: "Associate",
      competencies: [
        {
          competencyId: data?.competencies[0]?.id ?? "",
          weight: 100,
          expectedProficiency: 80,
          observableBehaviours: "",
          commonMistakes: "",
          businessOutcomes: "",
        },
      ],
    });
  }

  function startEdit(roleId: string) {
    if (!data) return;
    const role = data.roles.find((r) => r.id === roleId);
    if (!role) return;
    const rcs = data.roleCompetencies.filter((rc) => rc.roleId === roleId);
    setEditingId(roleId);
    setShowForm(true);
    form.reset({
      name: role.name,
      departmentId: role.departmentId,
      description: role.description,
      seniorityLevel: role.seniorityLevel,
      competencies: rcs.map((rc) => ({
        competencyId: rc.competencyId,
        weight: rc.weight,
        expectedProficiency: rc.expectedProficiency,
        observableBehaviours: rc.observableBehaviours.join("\n"),
        commonMistakes: rc.commonMistakes.join("\n"),
        businessOutcomes: rc.businessOutcomes.join("\n"),
      })),
    });
  }

  function onSubmit(values: RoleFormValues) {
    if (!data) return;
    if (Math.abs(weightSum - 100) > 0.5) {
      toast.error("Competency weights must sum to 100");
      return;
    }
    const roleId = editingId ?? uid("role");
    upsertRole(
      {
        id: roleId,
        organisationId: data.organisation.id,
        name: values.name,
        departmentId: values.departmentId,
        description: values.description,
        seniorityLevel: values.seniorityLevel,
      },
      values.competencies.map((c) => ({
        competencyId: c.competencyId,
        weight: c.weight,
        expectedProficiency: c.expectedProficiency,
        observableBehaviours: splitLines(c.observableBehaviours),
        commonMistakes: splitLines(c.commonMistakes),
        businessOutcomes: splitLines(c.businessOutcomes),
      }))
    );
    toast.success(editingId ? "Role updated" : "Role created");
    setShowForm(false);
    setEditingId(null);
    reload();
  }

  const matrix = useMemo(() => {
    if (!data) return [];
    return data.roles.map((role) => {
      const rcs = data.roleCompetencies.filter((rc) => rc.roleId === role.id);
      const employees = data.employeeProfiles.filter((ep) => ep.roleId === role.id);
      return {
        role,
        competencies: rcs,
        employees: employees.map((ep) => {
          const user = data.users.find((u) => u.id === ep.userId);
          const latest = data.attempts
            .filter((a) => a.employeeId === ep.id && a.status === "completed")
            .sort(
              (a, b) =>
                new Date(b.completedAt || b.createdAt).getTime() -
                new Date(a.completedAt || a.createdAt).getTime()
            )[0];
          const scores = Object.fromEntries(
            (latest?.competencyScores ?? []).map((cs) => [cs.competencyId, cs.score])
          );
          return {
            id: ep.id,
            name: user?.name ?? "Unknown",
            readiness: ep.readinessScore,
            scores,
          };
        }),
      };
    });
  }, [data]);

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
          <h1 className="text-2xl font-semibold text-navy">Roles and Skills</h1>
          <p className="text-sm text-muted-foreground">
            Define role expectations and weighted competencies for readiness scoring.
          </p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4" />
          New role
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.roles.map((role) => {
          const dept = data.departments.find((d) => d.id === role.departmentId);
          const rcs = data.roleCompetencies.filter((rc) => rc.roleId === role.id);
          const headcount = data.employeeProfiles.filter((ep) => ep.roleId === role.id).length;
          return (
            <Card key={role.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>{role.name}</CardTitle>
                  <CardDescription>
                    {dept?.name ?? "—"} · {role.seniorityLevel} · {headcount} employees
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => startEdit(role.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{role.description}</p>
                <div className="space-y-2">
                  {rcs.map((rc) => (
                    <div key={rc.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-navy">{names[rc.competencyId] ?? rc.competencyId}</span>
                        <span className="text-muted-foreground">
                          weight {rc.weight}% · target {rc.expectedProficiency}
                        </span>
                      </div>
                      <Progress value={rc.weight} />
                    </div>
                  ))}
                  {rcs.length === 0 && (
                    <p className="text-xs text-muted-foreground">No competencies mapped yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit role" : "Create role"}</CardTitle>
            <CardDescription>Weights across competencies should total 100.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Role name</Label>
                  <Input id="name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-risk">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="departmentId">Department</Label>
                  <select
                    id="departmentId"
                    className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                    {...form.register("departmentId")}
                  >
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seniorityLevel">Seniority</Label>
                  <Input id="seniorityLevel" {...form.register("seniorityLevel")} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" {...form.register("description")} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy">Weighted competencies</h3>
                <Badge variant={Math.abs(weightSum - 100) < 0.5 ? "success" : "warning"}>
                  Weight sum: {weightSum}
                </Badge>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-md border border-border p-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Competency</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                          {...form.register(`competencies.${index}.competencyId`)}
                        >
                          {data.competencies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Weight %</Label>
                        <Input
                          type="number"
                          {...form.register(`competencies.${index}.weight`, { valueAsNumber: true })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Expected proficiency</Label>
                        <Input
                          type="number"
                          {...form.register(`competencies.${index}.expectedProficiency`, {
                            valueAsNumber: true,
                          })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Observable behaviours</Label>
                        <Textarea {...form.register(`competencies.${index}.observableBehaviours`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Common mistakes</Label>
                        <Textarea {...form.register(`competencies.${index}.commonMistakes`)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Business outcomes</Label>
                        <Textarea {...form.register(`competencies.${index}.businessOutcomes`)} />
                      </div>
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                        Remove competency
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      competencyId: data.competencies[0]?.id ?? "",
                      weight: 10,
                      expectedProficiency: 80,
                      observableBehaviours: "",
                      commonMistakes: "",
                      businessOutcomes: "",
                    })
                  }
                >
                  Add competency
                </Button>
                <Button type="submit">{editingId ? "Save changes" : "Create role"}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Role readiness matrix</CardTitle>
          <CardDescription>Employees vs role competencies (latest attempt scores)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 overflow-x-auto">
          {matrix.map((block) => (
            <div key={block.role.id}>
              <h3 className="mb-2 text-sm font-semibold text-navy">{block.role.name}</h3>
              {block.employees.length === 0 || block.competencies.length === 0 ? (
                <p className="text-xs text-muted-foreground">No matrix data for this role yet.</p>
              ) : (
                <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Employee</th>
                      <th className="py-2 pr-3 font-medium">Readiness</th>
                      {block.competencies.map((c) => (
                        <th key={c.id} className="py-2 pr-3 font-medium">
                          {names[c.competencyId] ?? c.competencyId}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.employees.map((emp) => (
                      <tr key={emp.id} className="border-b border-border/70">
                        <td className="py-2 pr-3 font-medium text-navy">{emp.name}</td>
                        <td className="py-2 pr-3 tabular-nums">{Math.round(emp.readiness)}</td>
                        {block.competencies.map((c) => {
                          const score = emp.scores[c.competencyId];
                          const gap = score === undefined ? null : c.expectedProficiency - score;
                          return (
                            <td key={c.id} className="py-2 pr-3">
                              {score === undefined ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className={gap !== null && gap > 0 ? "text-risk" : "text-success"}>
                                  {score}
                                  {gap !== null && gap > 0 ? ` (−${gap})` : ""}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
