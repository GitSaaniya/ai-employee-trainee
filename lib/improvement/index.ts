import type {
  FeedbackReport,
  ImprovementAction,
  ImprovementPlan,
  ResponseOption,
  Simulation,
  SimulationAttempt,
} from "@/lib/types";
import { performanceBandLabel } from "@/lib/scoring";
import { uid } from "@/lib/utils";

export function buildFeedbackReport(params: {
  attempt: SimulationAttempt;
  simulation: Simulation;
  selectedOptions: ResponseOption[];
  competencyNames: Record<string, string>;
}): FeedbackReport {
  const { attempt, simulation, selectedOptions, competencyNames } = params;
  const scores = [...attempt.competencyScores].sort((a, b) => b.score - a.score);
  const gaps = [...attempt.competencyScores].sort((a, b) => b.gap - a.gap);

  const strengths = scores.slice(0, 3).map((c) => competencyNames[c.competencyId] ?? c.competencyId);
  const developmentAreas = gaps
    .filter((c) => c.gap > 0)
    .slice(0, 3)
    .map((c) => competencyNames[c.competencyId] ?? c.competencyId);

  const strongDecisions = selectedOptions
    .filter((o) => o.isBest || o.score >= 80)
    .map((o) => o.feedback);
  const missedOpportunities = selectedOptions
    .filter((o) => !o.isBest && !o.isCriticalFailure && o.score < 70)
    .map((o) => o.feedback);
  const criticalErrors = selectedOptions.filter((o) => o.isCriticalFailure).map((o) => o.feedback);

  const specificFeedback = selectedOptions.map((o) => o.feedback);

  return {
    id: uid("feedback"),
    attemptId: attempt.id,
    employeeId: attempt.employeeId,
    organisationId: attempt.organisationId,
    overallScore: attempt.overallScore ?? 0,
    performanceBand: attempt.performanceBand ?? "development_needed",
    strengths,
    developmentAreas: developmentAreas.length ? developmentAreas : strengths.slice(-1),
    strongDecisions,
    missedOpportunities,
    criticalErrors,
    specificFeedback,
    recommendedNextPractice: `Retry “${simulation.title}” focusing on ${developmentAreas[0] ?? "decision quality"} before offering resolutions.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function buildImprovementPlan(params: {
  attempt: SimulationAttempt;
  feedback: FeedbackReport;
  competencyNames: Record<string, string>;
  simulationTitle: string;
}): ImprovementPlan {
  const { attempt, feedback, competencyNames, simulationTitle } = params;
  const now = new Date();
  const review = new Date(now);
  review.setDate(review.getDate() + 14);

  const gapScores = [...attempt.competencyScores]
    .filter((c) => c.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  const actions: ImprovementAction[] = gapScores.map((gap, index) => {
    const skill = competencyNames[gap.competencyId] ?? gap.competencyId;
    const evidence =
      feedback.specificFeedback[index] ??
      `Score of ${gap.score} vs required ${gap.required} on ${skill} during “${simulationTitle}”.`;
    return {
      id: uid("action"),
      planId: "",
      skillToImprove: skill,
      evidence,
      recommendedAction: `In the next attempt, pause to verify policy requirements before committing to a customer outcome related to ${skill}.`,
      practiceActivity: `Complete a targeted practice stage emphasising ${skill}, then debrief with your manager.`,
      successMeasure: `Raise ${skill} score to at least ${gap.required} and eliminate critical failures.`,
      reviewDate: review.toISOString(),
      status: "pending",
      aiGenerated: true,
    };
  });

  if (actions.length === 0) {
    actions.push({
      id: uid("action"),
      planId: "",
      skillToImprove: feedback.strengths[0] ?? "Decision-making",
      evidence: `Overall score ${feedback.overallScore} (${performanceBandLabel(feedback.performanceBand)}).`,
      recommendedAction: "Maintain strengths while coaching a peer through a similar scenario.",
      practiceActivity: `Mentor a colleague on one stage of “${simulationTitle}”.`,
      successMeasure: "Sustain readiness at or above 85 on the next attempt.",
      reviewDate: review.toISOString(),
      status: "pending",
      aiGenerated: true,
    });
  }

  const planId = uid("plan");
  return {
    id: planId,
    organisationId: attempt.organisationId,
    employeeId: attempt.employeeId,
    attemptId: attempt.id,
    title: `Improvement plan after ${simulationTitle}`,
    summary: `Focus on ${feedback.developmentAreas.join(", ") || "sustaining readiness"} based on evidence from the latest simulation attempt.`,
    actions: actions.map((a) => ({ ...a, planId })),
    status: "pending_review",
    aiGenerated: true,
    reviewedByAdmin: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
