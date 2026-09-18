"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const steps = [
  { id: 1, label: "Admin workforce dashboard", href: "/admin", role: "admin" as const },
  { id: 2, label: "Experience · AI Assessment home", href: "/admin/experience", role: "admin" as const },
  {
    id: 3,
    label: "Open Mall Floor Shampoo Pitch",
    href: "/admin/assessments/assess_mall_shampoo",
    role: "admin" as const,
  },
  {
    id: 4,
    label: "Deploy / confirm assignments",
    href: "/admin/assessments/assess_mall_shampoo",
    role: "admin" as const,
  },
  { id: 5, label: "Switch to employee", href: "/login?demo=employee", role: "both" as const },
  { id: 6, label: "Start AI Assessment interview", href: "/employee/assessments", role: "employee" as const },
  { id: 7, label: "Employee readiness summary", href: "/employee/assessments", role: "employee" as const },
  {
    id: 8,
    label: "Admin cohort analytics + deploy next",
    href: "/admin/assessments/assess_mall_shampoo/analytics",
    role: "admin" as const,
  },
  { id: 9, label: "Classic BFSI simulation (optional)", href: "/admin/simulations/sim_hv_alert", role: "admin" as const },
  { id: 10, label: "Workforce analytics", href: "/admin/analytics", role: "admin" as const },
];

export function DemoModePanel({ variant }: { variant: "admin" | "employee" }) {
  const [current, setCurrent] = useState(variant === "admin" ? 2 : 6);
  const visible = useMemo(
    () => steps.filter((s) => s.role === "both" || s.role === variant),
    [variant]
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px]">
      <Card className="border-primary/25 shadow-xl shadow-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              Demo Mode · 4E Experience
            </span>
            <Badge variant="secondary">{visible.length} steps</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            ~10-minute CHRO walkthrough: author AI Assessment → learner interview → cohort analytics.
          </p>
          <Separator />
          <ScrollArea className="h-52 pr-2">
            <ol className="space-y-1">
              {visible.map((step) => (
                <li key={step.id}>
                  <Link
                    href={step.href}
                    onClick={() => setCurrent(step.id)}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    {current === step.id ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span>
                      <span className="font-semibold text-navy">{step.id}. </span>
                      {step.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </ScrollArea>
          <Button asChild size="sm" className="w-full">
            <Link
              href={
                variant === "admin"
                  ? "/admin/experience"
                  : "/employee/assessments"
              }
            >
              {variant === "admin" ? "Jump to Experience" : "Jump to AI Assessment"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
