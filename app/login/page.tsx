"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { hydrateFromServer, loginAs, setSession } from "@/lib/data/store";
import { FadeIn } from "@/components/ui/motion";
import type { AppSession } from "@/lib/types";

async function completeLogin(params: {
  email: string;
  password: string;
}): Promise<AppSession> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    session?: AppSession;
  };
  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }
  // Refresh workspace from Mongo so newly added employees exist locally.
  await hydrateFromServer(true);
  const local = loginAs(params.email);
  if (local) return local;
  if (data.session) {
    setSession(data.session);
    return data.session;
  }
  throw new Error("Could not establish local session");
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<"admin" | "employee" | null>(null);
  const [adminEmail, setAdminEmail] = useState("admin@skillsim.ai");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePassword, setEmployeePassword] = useState("");
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);

  useEffect(() => {
    const demo = searchParams.get("demo");
    if (demo === "employee") {
      setEmployeeEmail("manu.nair@knolskape.in");
    }
    if (demo === "admin") {
      setAdminEmail("admin@skillsim.ai");
    }
  }, [searchParams]);

  async function handleAdminLogin() {
    try {
      setLoading("admin");
      const session = await completeLogin({
        email: adminEmail.trim(),
        password: adminPassword,
      });
      toast.success(`Signed in as ${session.name}`);
      router.replace("/admin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setLoading(null);
    }
  }

  async function handleEmployeeLogin() {
    try {
      setLoading("employee");
      const session = await completeLogin({
        email: employeeEmail.trim(),
        password: employeePassword,
      });
      toast.success(`Signed in as ${session.name}`);
      router.replace("/employee");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setLoading(null);
    }
  }

  return (
    <div className="experience-theme relative min-h-screen overflow-hidden text-white">
      <div className="experience-stars pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <FadeIn direction="right" duration={520} className="max-w-xl">
          <Badge className="mb-4 border-0 bg-[#00E5FF]/15 text-[#00E5FF]">Enterprise training simulator</Badge>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#007BFF] text-xl font-bold text-[#0B0E14] shadow-[0_0_24px_rgba(0,229,255,0.35)]">
              G
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-experience-display)] text-3xl tracking-tight text-white md:text-4xl">
                Genie <span className="text-white/50">·</span> SkillSim AI
              </h1>
              <p className="text-sm text-white/50">Role readiness · Decision practice · Coaching loop</p>
            </div>
          </div>
          <p className="text-base leading-relaxed text-white/55 md:text-lg">
            Define competencies, run realistic workplace simulations, score decisions, and close the loop with
            targeted improvement plans — built for L&D and people leaders.
          </p>
          <Separator className="my-6 bg-white/10" />
          <ul className="space-y-2 text-sm text-white/50">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF]" /> Competency-weighted scoring
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF]" /> Evidence-based feedback and coaching plans
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF]" /> Team analytics and employee comparison
            </li>
          </ul>
        </FadeIn>

        <FadeIn delay={120} duration={560} className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#00E5FF]/10 p-2 text-[#00E5FF]">
                    <Shield className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-white">Administrator</CardTitle>
                </div>
                <Badge>L&D / Manager</Badge>
              </div>
              <CardDescription className="text-white/45">
                Build roles, assign simulations, monitor readiness, and coach employees who need support.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              <div className="space-y-1.5">
                <Label className="text-white/70">Email</Label>
                <Input
                  type="email"
                  autoComplete="username"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
                  placeholder="admin@skillsim.ai"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Password</Label>
                <div className="relative">
                  <Input
                    type={showAdminPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="border-white/15 bg-white/5 pr-10 text-white placeholder:text-white/35"
                    placeholder="Enter admin password"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleAdminLogin();
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showAdminPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/45 transition-colors hover:text-white/80"
                    onClick={() => setShowAdminPassword((v) => !v)}
                  >
                    {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full" disabled={loading !== null} onClick={() => void handleAdminLogin()}>
                {loading === "admin" ? "Signing in…" : "Continue as Admin"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-[#00E5FF]/10 p-2 text-[#00E5FF]">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-white">Employee</CardTitle>
                </div>
                <Badge variant="secondary">Learner</Badge>
              </div>
              <CardDescription className="text-white/45">
                Complete assigned simulations, review feedback, and work through improvement plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              <div className="space-y-1.5">
                <Label className="text-white/70">Work email</Label>
                <Input
                  type="email"
                  autoComplete="username"
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
                  placeholder="manu.nair@knolskape.in"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Password</Label>
                <div className="relative">
                  <Input
                    type={showEmployeePassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={employeePassword}
                    onChange={(e) => setEmployeePassword(e.target.value)}
                    className="border-white/15 bg-white/5 pr-10 text-white placeholder:text-white/35"
                    placeholder="Enter employee password"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleEmployeeLogin();
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showEmployeePassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/45 transition-colors hover:text-white/80"
                    onClick={() => setShowEmployeePassword((v) => !v)}
                  >
                    {showEmployeePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                className="w-full"
                variant="outline"
                disabled={loading !== null}
                onClick={() => void handleEmployeeLogin()}
              >
                {loading === "employee" ? "Signing in…" : "Continue as Employee"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="experience-theme flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
