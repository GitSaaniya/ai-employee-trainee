"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 rounded-full bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-[#121821]/60 px-6 py-14 text-center">
      <div className="rounded-full bg-[#00E5FF]/10 p-3 text-[#00E5FF]">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-white/50">{description}</p>
      </div>
      {action}
    </div>
  );
}
