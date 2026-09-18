import type {
  CompetencyScore,
  ResponseOption,
  RewindCriticalMoment,
  Simulation,
  SimulationAttempt,
} from "@/lib/types";
import { scoreAttempt } from "@/lib/scoring";

function competencyDeltas(
  original: ResponseOption,
  best: ResponseOption
): string[] {
  const ids = new Set([
    ...Object.keys(original.competencyImpacts),
    ...Object.keys(best.competencyImpacts),
  ]);
  const hurt: { id: string; delta: number }[] = [];
  for (const id of ids) {
    const delta = (best.competencyImpacts[id] ?? 0) - (original.competencyImpacts[id] ?? 0);
    if (delta >= 15) hurt.push({ id, delta });
  }
  return hurt.sort((a, b) => b.delta - a.delta).map((h) => h.id);
}

function buildImpactSummary(params: {
  characterName: string;
  original: ResponseOption;
  best: ResponseOption;
  competencyNames: Record<string, string>;
}): string {
  const { characterName, original, best, competencyNames } = params;
  const affected = competencyDeltas(original, best)
    .slice(0, 2)
    .map((id) => competencyNames[id] || "readiness")
    .filter(Boolean);

  const skillPhrase =
    affected.length > 0
      ? affected.map((s) => s.toLowerCase()).join(" and ")
      : "overall readiness";

  if (original.isCriticalFailure) {
    return `When ${characterName} pressed you, your choice created a critical control risk. This reduced ${skillPhrase}. Rewind and try a safer response that still shows empathy.`;
  }

  // Prefer concrete coaching from option feedback when available
  const tip = best.feedback?.trim();
  if (tip && tip.length < 220) {
    return `${tip} This reduced your ${skillPhrase} score. Rewind and try: “${best.text.slice(0, 120)}${best.text.length > 120 ? "…" : ""}”`;
  }

  return `Your response skipped the stronger move: acknowledge ${characterName}'s concern before explaining policy or next steps. That lowered ${skillPhrase}. Rewind and try acknowledging first.`;
}

/**
 * Pick 2–3 stages where the learner’s choice most hurt the outcome
 * (critical failure, not-best, or large score gap vs best option).
 */
export function identifyCriticalMoments(params: {
  simulation: Simulation;
  attempt: SimulationAttempt;
  competencyNames?: Record<string, string>;
  limit?: number;
}): RewindCriticalMoment[] {
  const { simulation, attempt, competencyNames = {}, limit = 3 } = params;
  const moments: (RewindCriticalMoment & { rank: number })[] = [];

  for (const response of attempt.stageResponses) {
    const stage = simulation.stages.find((s) => s.id === response.stageId);
    if (!stage) continue;
    const original = stage.options.find((o) => o.id === response.optionId);
    const best = stage.options.find((o) => o.isBest) || [...stage.options].sort((a, b) => b.score - a.score)[0];
    if (!original || !best) continue;
    if (original.id === best.id && !original.isCriticalFailure) continue;

    const scoreGap = best.score - original.score;
    if (!original.isCriticalFailure && scoreGap < 20) continue;

    let severity: RewindCriticalMoment["severity"] = "medium";
    let rank = scoreGap;
    if (original.isCriticalFailure) {
      severity = "critical";
      rank = 1000 + scoreGap;
    } else if (scoreGap >= 40) {
      severity = "high";
      rank = 500 + scoreGap;
    }

    moments.push({
      rank,
      stageId: stage.id,
      stageOrder: stage.order,
      stageTitle: stage.title,
      characterName: stage.characterName,
      characterRole: stage.characterRole,
      characterMessage: stage.characterMessage,
      decisionPrompt: stage.decisionPrompt,
      originalOptionId: original.id,
      originalLabel: original.label,
      originalText: original.text,
      originalConsequence: original.consequence,
      originalScore: original.score,
      bestOptionId: best.id,
      bestOptionText: best.text,
      impactSummary: buildImpactSummary({
        characterName: stage.characterName,
        original,
        best,
        competencyNames,
      }),
      affectedCompetencyIds: competencyDeltas(original, best).slice(0, 3),
      severity,
    });
  }

  return moments
    .sort((a, b) => b.rank - a.rank || a.stageOrder - b.stageOrder)
    .slice(0, limit)
    .map(({ rank: _r, ...rest }) => rest);
}

/** Rescore the attempt as if one stage used a different option. */
export function scoreWithRevisedChoice(params: {
  simulation: Simulation;
  attempt: SimulationAttempt;
  stageId: string;
  revisedOptionId: string;
}): {
  overallScore: number;
  competencyScores: CompetencyScore[];
  revisedOption: ResponseOption;
  consequence: string;
} {
  const { simulation, attempt, stageId, revisedOptionId } = params;
  const stage = simulation.stages.find((s) => s.id === stageId);
  const revisedOption = stage?.options.find((o) => o.id === revisedOptionId);
  if (!stage || !revisedOption) throw new Error("Revised option not found");

  const selectedOptions = attempt.stageResponses
    .map((r) => {
      if (r.stageId === stageId) return revisedOption;
      const st = simulation.stages.find((s) => s.id === r.stageId);
      return st?.options.find((o) => o.id === r.optionId);
    })
    .filter((o): o is ResponseOption => Boolean(o));

  const scored = scoreAttempt(simulation, selectedOptions);
  return {
    overallScore: scored.overallScore,
    competencyScores: scored.competencyScores,
    revisedOption,
    consequence: revisedOption.consequence,
  };
}
