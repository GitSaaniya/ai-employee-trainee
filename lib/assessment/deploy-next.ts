import type { AppData } from "@/lib/types";

export type DeployNextSuggestion = {
  skill: string;
  reason: string;
  href: string;
  label: string;
};

/** Map capability gaps to next Experience / simulation deployments. */
export function suggestDeployNext(
  data: AppData,
  weakestSkills: { name: string; avg: number }[]
): DeployNextSuggestion[] {
  const suggestions: DeployNextSuggestion[] = [];
  const publishedSims = data.simulations.filter((s) => s.status === "published");

  for (const skill of weakestSkills.slice(0, 3)) {
    const name = skill.name.toLowerCase();
    if (name.includes("objection") || name.includes("discovery") || name.includes("closing") || name.includes("product")) {
      suggestions.push({
        skill: skill.name,
        reason: `Cohort avg ${skill.avg}% — deploy targeted sales floor practice.`,
        href: "/admin/experience/templates",
        label: "Browse AI Assessment templates",
      });
      continue;
    }
    if (name.includes("risk") || name.includes("escalat") || name.includes("compliance")) {
      const sim = publishedSims.find((s) => s.id === "sim_hv_alert") ?? publishedSims[0];
      suggestions.push({
        skill: skill.name,
        reason: `Cohort avg ${skill.avg}% — reinforce with decision simulation.`,
        href: sim ? `/admin/simulations/${sim.id}` : "/admin/simulations",
        label: sim ? `Open “${sim.title}”` : "Simulation library",
      });
      continue;
    }
    suggestions.push({
      skill: skill.name,
      reason: `Cohort avg ${skill.avg}% — assign follow-up practice.`,
      href: "/admin/assignments",
      label: "Create assignment",
    });
  }

  // Deduplicate by href+skill
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const key = `${s.skill}:${s.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function heatmapColor(score: number): string {
  if (score >= 80) return "bg-emerald-500/80";
  if (score >= 65) return "bg-cyan-500/70";
  if (score >= 50) return "bg-amber-500/70";
  return "bg-rose-500/70";
}
