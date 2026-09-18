"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getData } from "@/lib/data/store";
import type { AppData, Integration } from "@/lib/types";

const categories: { key: Integration["category"]; label: string }[] = [
  { key: "hris", label: "HRIS" },
  { key: "lms", label: "LMS / LXP" },
  { key: "identity", label: "Identity and SSO" },
  { key: "collaboration", label: "Collaboration tools" },
  { key: "analytics", label: "Analytics" },
];

export default function IntegrationsPage() {
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => setData(getData()), []);
  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Visual catalogue of enterprise systems SkillSim AI can connect to. Statuses are for demonstration only.
        </p>
      </div>
      <Card>
        <CardContent className="pt-5 text-sm text-muted-foreground">
          When employee role data, learning records and simulation performance are connected, organisations can understand
          how employees are performing against the skills required for their roles, where capability gaps exist and what
          development support is needed next.
        </CardContent>
      </Card>
      {categories.map((cat) => (
        <div key={cat.key} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat.label}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.integrations
              .filter((i) => i.category === cat.key)
              .map((i) => (
                <Card key={i.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <CardTitle className="text-base">{i.name}</CardTitle>
                    <Badge
                      variant={
                        i.status === "connected" ? "success" : i.status === "available" ? "default" : "outline"
                      }
                    >
                      {i.status === "coming_soon" ? "Coming soon" : i.status === "connected" ? "Connected" : "Available"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{i.description}</CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
