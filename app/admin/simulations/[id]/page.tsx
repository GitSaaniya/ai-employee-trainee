"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SimulationBuilder } from "@/components/simulation/builder";
import { getData } from "@/lib/data/store";
import type { AppData, Simulation } from "@/lib/types";

export default function EditSimulationPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AppData | null>(null);
  const [sim, setSim] = useState<Simulation | null>(null);

  useEffect(() => {
    const d = getData();
    setData(d);
    setSim(d.simulations.find((s) => s.id === params.id) ?? null);
  }, [params.id]);

  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  if (!sim) return <div>Simulation not found.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">{sim.title}</h1>
        <p className="text-sm text-muted-foreground">Edit, preview, and publish</p>
      </div>
      <SimulationBuilder
        initial={sim}
        data={data}
        onSaved={(s) => {
          setSim(s);
          setData(getData());
        }}
      />
    </div>
  );
}
