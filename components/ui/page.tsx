import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500", className)}>
      <div className="space-y-1">
        <h1 className="font-[family-name:var(--font-experience-display)] text-3xl tracking-tight text-white md:text-[2rem]">
          {title}
        </h1>
        {description ? <p className="text-sm text-white/50">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: { value: string; positive?: boolean };
}) {
  return (
    <div className="motion-lift rounded-2xl border border-white/10 bg-[#121821]/90 p-5 hover:border-[#00E5FF]/25">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-white/50">{label}</div>
        {Icon ? (
          <div className="rounded-lg bg-[#00E5FF]/10 p-2 text-[#00E5FF]">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
      {(hint || trend) && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {trend ? (
            <span className={trend.positive === false ? "text-risk" : "text-success"}>{trend.value}</span>
          ) : null}
          {hint}
        </div>
      )}
    </div>
  );
}
