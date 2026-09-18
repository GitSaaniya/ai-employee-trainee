"use client";

import { useEffect, useState } from "react";
import { SimulationBuilder } from "@/components/simulation/builder";
import { getData } from "@/lib/data/store";
import type { AppData, Simulation } from "@/lib/types";
import { uid } from "@/lib/utils";

export default function NewSimulationPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [initial, setInitial] = useState<Simulation | null>(null);

  useEffect(() => {
    const d = getData();
    setData(d);
    const id = uid("sim");
    const comps = d.competencies.slice(0, 5);
    setInitial({
      id,
      organisationId: d.organisation.id,
      title: "",
      businessProblem: "",
      targetRoleId: d.roles[0]?.id ?? "",
      learningObjective: "",
      difficulty: "intermediate",
      estimatedDurationMinutes: 15,
      scenarioContext: "",
      characters: [],
      employeeResponsibility: "",
      constraints: [],
      policies: [],
      assessedCompetencyIds: comps.map((c) => c.id),
      competencyWeights: Object.fromEntries(comps.map((c, i) => [c.id, i === 0 ? 20 : 20])),
      passingScore: 70,
      criticalFailureBehaviours: [],
      performanceBands: {
        ready: [85, 100],
        nearlyReady: [70, 84],
        developmentNeeded: [50, 69],
        highSupport: [0, 49],
      },
      status: "draft",
      stages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  if (!data || !initial) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">New simulation</h1>
        <p className="text-sm text-muted-foreground">Multi-step builder with Demo AI generation support</p>
      </div>
      <SimulationBuilder initial={initial} data={data} />
    </div>
  );
}
