"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  Settings,
  Sparkles,
  Star,
  Target,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getData, getSession, logout, setDemoMode } from "@/lib/data/store";
import type { AppSession } from "@/lib/types";
import { DemoModePanel } from "@/components/layout/demo-mode";

const COLLAPSE_KEY = "skillsim_sidebar_collapsed";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/experience", label: "Experience", icon: Star },
  { href: "/admin/assessments", label: "AI Assessments", icon: Video },
  { href: "/admin/roles", label: "Roles and Skills", icon: Target },
  { href: "/admin/simulations", label: "Simulation Builder", icon: BookOpen },
  { href: "/admin/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/improvement-plans", label: "Improvement Plans", icon: Sparkles },
  { href: "/admin/integrations", label: "Integrations", icon: Plug },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];
const employeeNav = [
  { href: "/employee", label: "My Dashboard", icon: LayoutDashboard },
  { href: "/employee/assessments", label: "AI Assessment", icon: Video },
  { href: "/employee/training", label: "Assigned Training", icon: ClipboardList },
  { href: "/employee/practice", label: "Practice", icon: BookOpen },
  { href: "/employee/performance", label: "My Performance", icon: Gauge },
  { href: "/employee/improvement-plan", label: "Improvement Plan", icon: Sparkles },
];

function isGenieFullscreenPath(pathname: string) {
  return (
    pathname.startsWith("/admin/experience") ||
    pathname.startsWith("/admin/assessments") ||
    /^\/employee\/assessments\/[^/]+/.test(pathname)
  );
}

export function AppShell({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "admin" | "employee";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSessionState] = useState<AppSession | null>(null);
  const [demo, setDemo] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const nav = variant === "admin" ? adminNav : employeeNav;

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== variant) {
      router.replace("/login");
      return;
    }
    setSessionState(s);
    setDemo(getData().demoMode);
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // ignore
    }
  }, [router, variant]);

  function handleLogout() {
    logout();
    document.cookie = "skillsim_session=; Max-Age=0; path=/";
    void fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function toggleDemo(next: boolean) {
    setDemoMode(next);
    setDemo(next);
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  if (!session) {
    return (
      <div className="experience-theme flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00E5FF] border-t-transparent" />
      </div>
    );
  }

  const initials = session.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if ((variant === "admin" || variant === "employee") && isGenieFullscreenPath(pathname)) {
    return (
      <div className="min-h-screen">
        {children}
        {demo && <DemoModePanel variant={variant} />}
      </div>
    );
  }

  return (
    <div className="experience-theme relative h-dvh overflow-hidden text-white">
      <div className="experience-stars pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 flex h-full min-h-0">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex h-dvh flex-col border-r border-white/10 bg-[#0d1118]/95 backdrop-blur-md transition-all duration-300 lg:static lg:h-full",
            collapsed ? "lg:w-[76px]" : "lg:w-[260px]",
            "w-[min(260px,88vw)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Brand + collapse — fixed height */}
          <div
            className={cn(
              "flex h-16 shrink-0 items-center gap-2 border-b border-white/10",
              collapsed ? "justify-center px-2" : "justify-between px-3"
            )}
          >
            <Link
              href={`/${variant}`}
              className={cn("flex min-w-0 items-center gap-2.5", collapsed && "justify-center")}
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#007BFF] text-sm font-bold text-[#0B0E14] shadow-[0_0_20px_rgba(0,229,255,0.35)]">
                G
              </div>
              {!collapsed && (
                <div className="min-w-0 leading-tight">
                  <div className="bg-gradient-to-r from-[#7dd3fc] to-[#00E5FF] bg-clip-text font-[family-name:var(--font-experience-display)] text-lg tracking-tight text-transparent">
                    Genie
                  </div>
                  <div className="-mt-0.5 truncate text-[11px] font-medium tracking-wide text-white/55">
                    Kreator · SkillSim
                  </div>
                </div>
              )}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 shrink-0 text-white/50 hover:bg-white/10 hover:text-white lg:inline-flex"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Only nav links scroll */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
            {!collapsed && (
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {variant === "admin" ? "Administration" : "Learning"}
              </div>
            )}
            <nav className="space-y-0.5">
              {nav.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== `/${variant}` && pathname.startsWith(item.href));
                const Icon = item.icon;
                const link = (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-lg text-sm font-medium transition-colors",
                      collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2",
                      active
                        ? "bg-gradient-to-r from-[#007BFF]/25 to-[#00E5FF]/15 text-white shadow-[inset_3px_0_0_0_#00E5FF]"
                        : "text-white/55 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#00E5FF]")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );

                if (!collapsed) return link;

                return (
                  <Tooltip key={item.href} delayDuration={200}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </div>

          {/* User + Logout pinned to sidebar footer */}
          <div
            className={cn(
              "mt-auto shrink-0 border-t border-white/10 bg-[#0d1118] pb-[max(0.75rem,env(safe-area-inset-bottom))]",
              collapsed ? "p-2" : "p-3"
            )}
          >
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-8 w-8 border border-white/10">
                      <AvatarFallback className="bg-gradient-to-br from-[#007BFF] to-[#00E5FF] text-[11px] text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {session.name}
                    <br />
                    <span className="text-white/60">{session.email}</span>
                  </TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 border-white/15 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
                      onClick={handleLogout}
                      aria-label="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Logout</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                  <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                    <AvatarFallback className="bg-gradient-to-br from-[#007BFF] to-[#00E5FF] text-[11px] text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-white">{session.name}</div>
                    <div className="truncate text-[11px] text-white/45">{session.email}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-white/15 bg-transparent text-white/80 hover:bg-white/10 hover:text-white"
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            )}
          </div>
        </aside>

        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0b0e14]/80 px-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden text-white/70 hover:bg-white/10 hover:text-white lg:inline-flex"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-white">Meridian Financial Services</div>
                <div className="text-[11px] capitalize text-white/45">{variant} workspace</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#121821]/90 px-3 py-1.5">
                <span className="hidden text-xs text-white/50 sm:inline">Demo Mode</span>
                <Switch checked={demo} onCheckedChange={toggleDemo} aria-label="Toggle demo mode" />
                {demo ? <Badge>On</Badge> : <Badge variant="outline">Off</Badge>}
              </div>
            </div>
          </header>
          <main className="min-h-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both overflow-y-auto p-4 duration-500 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {demo && <DemoModePanel variant={variant} />}
    </div>
  );
}
