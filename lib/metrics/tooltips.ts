export const METRIC_TOOLTIPS: Record<string, string> = {
  completionRate:
    "Completion rate = completed assignments ÷ total assignments × 100. Shows how many assigned simulations learners finish.",
  readinessScore:
    "Readiness score = sum of (competency score × competency weight). Reflects how prepared an employee is for their role.",
  averageReadiness:
    "Average readiness across the selected employee group, weighted by each person's latest readiness score.",
  competencyGap:
    "Competency gap = required proficiency − employee competency score. Positive values indicate development need.",
  improvementPercentage:
    "Improvement % = (latest score − first score) ÷ first score × 100. Tracks progress across repeated attempts.",
  criticalErrorRate:
    "Critical-error rate = attempts containing a critical failure ÷ total attempts × 100.",
  needsSupport:
    "Needs support when readiness is below 70, a critical failure occurred, or two consecutive attempts showed no improvement.",
  passRate: "Pass rate = attempts meeting or exceeding the assignment passing score ÷ completed attempts × 100.",
  retryRate: "Retry rate = employees with more than one attempt ÷ employees who started × 100.",
  timeToCompletion: "Average minutes from attempt start to completion for finished simulations.",
  firstAttemptScore: "Average score on each learner's first completed attempt.",
  latestAttemptScore: "Average score on each learner's most recent completed attempt.",
  feedbackEngagement:
    "Share of completed attempts where the learner opened the detailed feedback report or started an improvement action.",
  employeesRequiringSupport: "Count of employees currently flagged by the needs-support rule.",
  averageScoreImprovement: "Mean improvement percentage across employees with at least two completed attempts.",
  performanceBand:
    "Bands: Ready 85–100, Nearly Ready 70–84, Development Needed 50–69, High Support Required below 50.",
};

export function tooltipFor(key: string): string {
  return METRIC_TOOLTIPS[key] ?? "Calculated metric used for coaching and workforce planning.";
}
