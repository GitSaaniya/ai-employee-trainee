"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getData } from "@/lib/data/store";
import type { AppData } from "@/lib/types";

export default function SimulationsListPage() {
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => setData(getData()), []);
  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Simulation Builder</h1>
          <p className="text-sm text-muted-foreground">Create, preview, and publish workplace simulations</p>
        </div>
        <Button asChild>
          <Link href="/admin/simulations/new"><Plus className="h-4 w-4" /> New simulation</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.simulations.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{s.title}</CardTitle>
                <Badge variant={s.status === "published" ? "success" : "outline"}>{s.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">{s.businessProblem}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{s.difficulty}</span>
                <span>·</span>
                <span>{s.estimatedDurationMinutes} min</span>
                <span>·</span>
                <span>{s.stages.length} stages</span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/simulations/${s.id}`}>Open builder</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
