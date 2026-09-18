"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppData, PerformanceBand, RiskLevel } from "@/lib/types";
import { createEmployee, getData } from "@/lib/data/store";
import { formatPercent, formatScore } from "@/lib/utils";
import {
  completionRate,
  getPerformanceBand,
  performanceBandLabel,
} from "@/lib/scoring";

type ReadinessFilter = "all" | PerformanceBand;
type CompletionFilter = "all" | "high" | "mid" | "low" | "none";

export default function AdminEmployeesPage() {
  const [data, setDataState] = useState<AppData | null>(null);
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("all");
  const [roleId, setRoleId] = useState("all");
  const [readiness, setReadiness] = useState<ReadinessFilter>("all");
  const [completion, setCompletion] = useState<CompletionFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");

  function refresh() {
    setDataState(getData());
  }

  useEffect(() => {
    refresh();
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.employeeProfiles.map((ep) => {
      const user = data.users.find((u) => u.id === ep.userId);
      const role = data.roles.find((r) => r.id === ep.roleId);
      const dept = data.departments.find((d) => d.id === ep.departmentId);
      const assigned = data.assignments.filter((a) => a.employeeIds.includes(ep.id));
      let completed = 0;
      for (const asg of assigned) {
        if (
          data.attempts.some(
            (a) => a.assignmentId === asg.id && a.employeeId === ep.id && a.status === "completed"
          )
        ) {
          completed += 1;
        }
      }
      const rate = completionRate(completed, assigned.length);
      const band = getPerformanceBand(ep.readinessScore);
      return {
        id: ep.id,
        name: user?.name ?? "Unknown",
        email: user?.email ?? "",
        role: role?.name ?? "—",
        roleId: ep.roleId,
        department: dept?.name ?? "—",
        departmentId: ep.departmentId,
        readiness: ep.readinessScore,
        previous: ep.previousScore,
        risk: ep.riskLevel as RiskLevel,
        band,
        bandLabel: performanceBandLabel(band),
        completion: rate,
        assignedCount: assigned.length,
        lastActivityAt: ep.lastActivityAt,
      };
    });
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && !`${row.name} ${row.email} ${row.role}`.toLowerCase().includes(q)) return false;
      if (departmentId !== "all" && row.departmentId !== departmentId) return false;
      if (roleId !== "all" && row.roleId !== roleId) return false;
      if (readiness !== "all" && row.band !== readiness) return false;
      if (completion === "high" && row.completion < 80) return false;
      if (completion === "mid" && (row.completion < 40 || row.completion >= 80)) return false;
      if (completion === "low" && (row.completion <= 0 || row.completion >= 40)) return false;
      if (completion === "none" && row.assignedCount > 0 && row.completion > 0) return false;
      if (completion === "none" && row.assignedCount === 0) return true;
      return true;
    });
  }, [rows, query, departmentId, roleId, readiness, completion]);

  function handleAddEmployee() {
    try {
      setSaving(true);
      const created = createEmployee({ name, email, department });
      toast.success(`${created.user.name} added — they can sign in with ${created.user.email}`);
      setName("");
      setEmail("");
      setDepartment("");
      setShowAdd(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add employee");
    } finally {
      setSaving(false);
    }
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Search and filter the workforce by department, role, readiness, and completion.
          </p>
        </div>
        <Button onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showAdd ? "Close" : "Add employee"}
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle>Add employee</CardTitle>
            <CardDescription>
              Required: name, work email, and department. They sign in on the Employee card with that email and the
              shared employee password from .env.local.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">Name</Label>
              <Input
                id="emp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Manu Nair"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-email">Email</Label>
              <Input
                id="emp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manu.nair@knolskape.in"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-dept">Department</Label>
              <Input
                id="emp-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Sales Manager"
                list="department-suggestions"
              />
              <datalist id="department-suggestions">
                {data.departments.map((d) => (
                  <option key={d.id} value={d.name} />
                ))}
              </datalist>
            </div>
            <div className="md:col-span-3">
              <Button disabled={saving} onClick={handleAddEmployee}>
                {saving ? "Saving…" : "Save employee"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            Showing {filtered.length} of {rows.length} employees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, email, role…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="all">All departments</option>
              {data.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="all">All roles</option>
              {data.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={readiness}
              onChange={(e) => setReadiness(e.target.value as ReadinessFilter)}
            >
              <option value="all">All readiness bands</option>
              <option value="ready">Ready</option>
              <option value="nearly_ready">Nearly Ready</option>
              <option value="development_needed">Development Needed</option>
              <option value="high_support_required">High Support Required</option>
            </select>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={completion}
              onChange={(e) => setCompletion(e.target.value as CompletionFilter)}
            >
              <option value="all">All completion</option>
              <option value="high">High (≥80%)</option>
              <option value="mid">Mid (40–79%)</option>
              <option value="low">Low (1–39%)</option>
              <option value="none">No completions</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Department</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Readiness</th>
                  <th className="px-3 py-2 font-medium">Band</th>
                  <th className="px-3 py-2 font-medium">Completion</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="font-medium text-navy">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.department}</td>
                    <td className="px-3 py-2">{row.role}</td>
                    <td className="px-3 py-2 tabular-nums font-medium">{formatScore(row.readiness)}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          row.band === "ready"
                            ? "success"
                            : row.band === "nearly_ready"
                              ? "default"
                              : row.band === "development_needed"
                                ? "warning"
                                : "risk"
                        }
                      >
                        {row.bandLabel}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatPercent(row.completion)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.risk === "low" ? "success" : row.risk === "medium" ? "warning" : "risk"}>
                        {row.risk}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/employees/${row.id}`}>Profile</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No employees match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
