import { describe, expect, it } from "vitest";
import {
  completionRate,
  competencyGap,
  criticalErrorRate,
  getPerformanceBand,
  improvementPercentage,
  needsSupport,
  readinessScore,
  scoreAttempt,
} from "@/lib/scoring";
import { buildImprovementPlan, buildFeedbackReport } from "@/lib/improvement";
import type { ResponseOption, Simulation, SimulationAttempt } from "@/lib/types";

describe("scoring formulas", () => {
  it("computes completion rate", () => {
    expect(completionRate(3, 4)).toBe(75);
    expect(completionRate(0, 0)).toBe(0);
  });

  it("computes readiness from weighted competencies", () => {
    const score = readinessScore([
      { competencyId: "a", score: 80, required: 85, gap: 5, weight: 50 },
      { competencyId: "b", score: 60, required: 80, gap: 20, weight: 50 },
    ]);
    expect(score).toBe(70);
  });

  it("computes gap and improvement", () => {
    expect(competencyGap(85, 70)).toBe(15);
    expect(improvementPercentage(50, 75)).toBe(50);
  });

  it("computes critical error rate and bands", () => {
    expect(criticalErrorRate(1, 4)).toBe(25);
    expect(getPerformanceBand(90)).toBe("ready");
    expect(getPerformanceBand(72)).toBe("nearly_ready");
    expect(getPerformanceBand(55)).toBe("development_needed");
    expect(getPerformanceBand(40)).toBe("high_support_required");
  });

  it("flags needs support", () => {
    expect(needsSupport({ readinessScore: 65, hasCriticalFailure: false, consecutiveNonImproving: false })).toBe(true);
    expect(needsSupport({ readinessScore: 80, hasCriticalFailure: true, consecutiveNonImproving: false })).toBe(true);
    expect(needsSupport({ readinessScore: 80, hasCriticalFailure: false, consecutiveNonImproving: true })).toBe(true);
    expect(needsSupport({ readinessScore: 80, hasCriticalFailure: false, consecutiveNonImproving: false })).toBe(false);
  });

  it("caps score on critical failure", () => {
    const simulation = {
      assessedCompetencyIds: ["c1"],
      competencyWeights: { c1: 100 },
    } as unknown as Simulation;
    const options = [
      {
        score: 95,
        isCriticalFailure: true,
        competencyImpacts: { c1: 90 },
      },
    ] as unknown as ResponseOption[];
    const result = scoreAttempt(simulation, options);
    expect(result.hasCriticalFailure).toBe(true);
    expect(result.overallScore).toBeLessThanOrEqual(49);
  });
});

describe("improvement plan generation", () => {
  it("builds specific actions from gaps", () => {
    const attempt = {
      id: "att_1",
      organisationId: "org",
      employeeId: "ep_1",
      assignmentId: "a",
      simulationId: "s",
      attemptNumber: 1,
      status: "completed",
      currentStageIndex: 1,
      stageResponses: [],
      hasCriticalFailure: false,
      timeSpentMinutes: 10,
      startedAt: "",
      createdAt: "",
      updatedAt: "",
      overallScore: 55,
      performanceBand: "development_needed",
      competencyScores: [
        { competencyId: "c1", score: 40, required: 85, gap: 45, weight: 50 },
        { competencyId: "c2", score: 70, required: 80, gap: 10, weight: 50 },
      ],
    } as SimulationAttempt;

    const feedback = buildFeedbackReport({
      attempt,
      simulation: {
        title: "Test Sim",
        assessedCompetencyIds: ["c1", "c2"],
        competencyWeights: { c1: 50, c2: 50 },
      } as unknown as Simulation,
      selectedOptions: [
        {
          feedback:
            "You acknowledged the customer’s concern but promised immediate approval before completing verification.",
        } as unknown as ResponseOption,
      ],
      competencyNames: { c1: "Risk awareness", c2: "Communication" },
    });

    const plan = buildImprovementPlan({
      attempt,
      feedback,
      competencyNames: { c1: "Risk awareness", c2: "Communication" },
      simulationTitle: "Test Sim",
    });

    expect(plan.aiGenerated).toBe(true);
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.actions[0].skillToImprove).toBe("Risk awareness");
    expect(plan.actions[0].evidence.length).toBeGreaterThan(10);
  });
});
