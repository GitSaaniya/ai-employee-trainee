"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getData, resetData, setDemoMode } from "@/lib/data/store";
import type { AppData } from "@/lib/types";

export default function SettingsPage() {
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => setData(getData()), []);
  if (!data) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Settings</h1>
        <p className="text-sm text-muted-foreground">Organisation preferences and demo controls</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Organisation</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <div className="font-medium">{data.organisation.name}</div>
          <div className="text-muted-foreground">Organisation ID: {data.organisation.id}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Demo Mode</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Demo Mode shows a guided ~10-minute CHRO checklist for the 4E Experience / AI Assessment
            walkthrough (plus classic simulation steps).
          </p>
          <Button
            variant={data.demoMode ? "secondary" : "default"}
            onClick={() => {
              setDemoMode(!data.demoMode);
              setData(getData());
              toast.success(`Demo Mode ${!data.demoMode ? "enabled" : "disabled"}`);
            }}
          >
            {data.demoMode ? "Turn Demo Mode off" : "Turn Demo Mode on"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Privacy and responsible use</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>SkillSim AI supports human coaching. It does not make automated hiring, termination, promotion, or disciplinary decisions.</p>
          <p>No medical, demographic, personality, or protected-trait scoring is used.</p>
          <p>AI-generated recommendations are labelled and should be reviewed by an administrator before activation.</p>
          <p>Employee comparison views are for coaching and workforce planning only.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Reset demo data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Restore the original seeded organisation, employees, simulations, AI Assessments
            (Mall Floor Shampoo Pitch), sessions, and attempts.
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Reset all local demo data to the seed state?")) {
                resetData();
                setData(getData());
                toast.success("Seed data restored");
              }
            }}
          >
            Reset seeded data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
