"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { tooltipFor } from "@/lib/metrics/tooltips";

export function MetricTip({ metricKey, label }: { metricKey: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger>
          <button type="button" className="text-muted-foreground hover:text-primary" aria-label={`About ${label}`}>
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{tooltipFor(metricKey)}</TooltipContent>
      </Tooltip>
    </span>
  );
}
