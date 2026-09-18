"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SimulationPlayer } from "@/components/simulation/player";
import { getData, getEmployeeProfileIdForUser, getSession } from "@/lib/data/store";
import type { AppData } from "@/lib/types";

export default function PlaySimulationPage() {
  const params = useParams<{ assignmentId: string }>();
  const [data, setData] = useState<AppData | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    setData(getData());
    const session = getSession();
    if (session) setEmployeeId(getEmployeeProfileIdForUser(session.userId) ?? null);
  }, []);

  if (!data || !employeeId) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  const assignment = data.assignments.find((a) => a.id === params.assignmentId);
  if (!assignment) return <div>Assignment not found.</div>;
  const simulation = data.simulations.find((s) => s.id === assignment.simulationId);
  if (!simulation) return <div>Simulation not found.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">{simulation.title}</h1>
        <p className="text-sm text-muted-foreground">{assignment.instructions}</p>
      </div>
      <SimulationPlayer
        simulation={simulation}
        assignmentId={assignment.id}
        employeeId={employeeId}
      />
    </div>
  );
}
