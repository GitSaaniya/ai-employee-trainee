import type {
  CompetencyScore,
  PerformanceBand,
  ResponseOption,
  RiskLevel,
  Simulation,
  SimulationAttempt,
} from "@/lib/types";
import { clamp } from "@/lib/utils";

export function getPerformanceBand(score: number): PerformanceBand {
  if (score >= 85) return "ready";
  if (score >= 70) return "nearly_ready";
  if (score >= 50) return "development_needed";
  return "high_support_required";
}

export function performanceBandLabel(band: PerformanceBand): string {
  switch (band) {
    case "ready":
      return "Ready";
    case "nearly_ready":
      return "Nearly Ready";
    case "development_needed":
      return "Development Needed";
    case "high_support_required":
      return "High Support Required";
  }
}

export function completionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return (completed / total) * 100;
}

export function competencyGap(required: number, actual: number): number {
  return required - actual;
}

export function improvementPercentage(firstScore: number, latestScore: number): number {
  if (firstScore === 0) return latestScore > 0 ? 100 : 0;
  return ((latestScore - firstScore) / firstScore) * 100;
}

export function criticalErrorRate(attemptsWithCritical: number, totalAttempts: number): number {
  if (totalAttempts === 0) return 0;
  return (attemptsWithCritical / totalAttempts) * 100;
}

export function readinessScore(competencyScores: CompetencyScore[]): number {
  const totalWeight = competencyScores.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = competencyScores.reduce((sum, c) => sum + c.score * (c.weight / 100), 0);
  // weights may be percent that sum to 100
  const weightSum = competencyScores.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(weightSum - 100) < 0.01) {
    return clamp(
      competencyScores.reduce((sum, c) => sum + c.score * (c.weight / 100), 0),
      0,
      100
    );
  }
  return clamp(weighted / (totalWeight / 100), 0, 100);
}

export function needsSupport(params: {
  readinessScore: number;
  hasCriticalFailure: boolean;
  consecutiveNonImproving: boolean;
}): boolean {
  return (
    params.readinessScore < 70 ||
    params.hasCriticalFailure ||
    params.consecutiveNonImproving
  );
}

export function detectConsecutiveNonImproving(attempts: SimulationAttempt[]): boolean {
  const completed = attempts
    .filter((a) => a.status === "completed" && typeof a.overallScore === "number")
    .sort((a, b) => new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime());
  if (completed.length < 2) return false;
  const last = completed[completed.length - 1];
  const prev = completed[completed.length - 2];
  return (last.overallScore ?? 0) <= (prev.overallScore ?? 0);
}

export function riskFromReadiness(score: number, hasCritical: boolean): RiskLevel {
  if (hasCritical || score < 50) return "critical";
  if (score < 70) return "high";
  if (score < 85) return "medium";
  return "low";
}

export function scoreAttempt(
  simulation: Simulation,
  selectedOptions: ResponseOption[]
): {
  overallScore: number;
  performanceBand: PerformanceBand;
  competencyScores: CompetencyScore[];
  hasCriticalFailure: boolean;
} {
  const hasCriticalFailure = selectedOptions.some((o) => o.isCriticalFailure);
  const competencyTotals: Record<string, { sum: number; count: number }> = {};

  for (const option of selectedOptions) {
    for (const [compId, impact] of Object.entries(option.competencyImpacts)) {
      if (!competencyTotals[compId]) competencyTotals[compId] = { sum: 0, count: 0 };
      competencyTotals[compId].sum += impact;
      competencyTotals[compId].count += 1;
    }
  }

  const competencyScores: CompetencyScore[] = simulation.assessedCompetencyIds.map((compId) => {
    const weight = simulation.competencyWeights[compId] ?? 0;
    const bucket = competencyTotals[compId];
    const score = bucket ? clamp(bucket.sum / bucket.count, 0, 100) : 0;
    const required = 80;
    return {
      competencyId: compId,
      score: Math.round(score),
      required,
      gap: competencyGap(required, Math.round(score)),
      weight,
    };
  });

  // Also blend stage option scores into overall
  const optionAvg =
    selectedOptions.length === 0
      ? 0
      : selectedOptions.reduce((s, o) => s + o.score, 0) / selectedOptions.length;

  const weightedReadiness = readinessScore(competencyScores);
  const overallScore = Math.round(clamp(weightedReadiness * 0.7 + optionAvg * 0.3, 0, 100));

  if (hasCriticalFailure && overallScore > 49) {
    // Cap score when critical failure occurred
    return {
      overallScore: Math.min(overallScore, 49),
      performanceBand: getPerformanceBand(Math.min(overallScore, 49)),
      competencyScores,
      hasCriticalFailure: true,
    };
  }

  return {
    overallScore,
    performanceBand: getPerformanceBand(overallScore),
    competencyScores,
    hasCriticalFailure,
  };
}
