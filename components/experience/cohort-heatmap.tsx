"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { heatmapColor, type DeployNextSuggestion } from "@/lib/assessment/deploy-next";

export function CohortHeatmap({
  skillNames,
  rows,
}: {
  skillNames: string[];
  rows: { name: string; scores: Record<string, number>; overall: number }[];
}) {
  if (!rows.length || !skillNames.length) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121821]/90">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-[10px] tracking-wider text-white/40 uppercase">
            <th className="px-4 py-3 font-semibold">Learner</th>
            {skillNames.map((s) => (
              <th key={s} className="px-2 py-3 font-semibold">
                {s}
              </th>
            ))}
            <th className="px-4 py-3 font-semibold">Overall</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-2.5 text-white/85">{row.name}</td>
              {skillNames.map((s) => {
                const score = row.scores[s] ?? 0;
                return (
                  <td key={s} className="px-2 py-2.5">
                    <div
                      className={cn(
                        "flex h-8 min-w-[3.5rem] items-center justify-center rounded-md text-xs font-semibold text-white",
                        heatmapColor(score)
                      )}
                      title={`${s}: ${score}%`}
                    >
                      {score}
                    </div>
                  </td>
                );
              })}
              <td className="px-4 py-2.5 font-medium text-[#00E5FF]">{row.overall}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DeployNextPanel({ suggestions }: { suggestions: DeployNextSuggestion[] }) {
  if (!suggestions.length) return null;
  return (
    <div className="rounded-2xl border border-[#00E5FF]/25 bg-[#00E5FF]/5 p-5">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-[#00E5FF] uppercase">
        03 · Actionable gaps
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">What to deploy next</h2>
      <p className="mt-1 text-sm text-white/50">
        Board-ready recommendations from cohort scores — soft-link into Experience or simulations.
      </p>
      <ul className="mt-4 space-y-3">
        {suggestions.map((s) => (
          <li
            key={`${s.skill}-${s.href}`}
            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="text-sm font-medium text-white">{s.skill}</div>
              <div className="text-xs text-white/45">{s.reason}</div>
            </div>
            <Link
              href={s.href}
              className="inline-flex shrink-0 items-center gap-1 text-sm text-[#00E5FF] hover:underline"
            >
              {s.label} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
