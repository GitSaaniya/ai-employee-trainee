import type { GenerateSimulationInput, Simulation, SimulationStage } from "@/lib/types";
import { uid } from "@/lib/utils";

const ORG = "org_meridian";

export function mockGenerateSimulation(
  input: GenerateSimulationInput,
  competencyWeights?: Record<string, number>
): Simulation {
  const simId = uid("sim");
  const weights =
    competencyWeights ??
    Object.fromEntries(
      input.competencyIds.map((id, i) => [
        id,
        Math.round(100 / input.competencyIds.length) + (i === 0 ? 100 % input.competencyIds.length : 0),
      ])
    );

  const stages: SimulationStage[] = [1, 2, 3].map((n) => {
    const stageId = uid("stage");
    const options = ["A", "B", "C", "D"].map((label, idx) => ({
      id: uid("opt"),
      stageId,
      label,
      text:
        idx === 1
          ? `Best response for stage ${n}: acknowledge the issue, apply policy, and confirm next steps.`
          : idx === 3
            ? `Risky response for stage ${n}: skip a required control to save time.`
            : `Alternative response ${label} for stage ${n}: partial adherence with weak communication.`,
      score: idx === 1 ? 92 : idx === 3 ? 15 : 45 + idx * 5,
      isBest: idx === 1,
      isCriticalFailure: idx === 3,
      competencyImpacts: Object.fromEntries(
        input.competencyIds.map((id) => [id, idx === 1 ? 90 : idx === 3 ? 20 : 50])
      ),
      feedback:
        idx === 1
          ? `You applied the right sequence: clarify, verify, then commit. Strong decision for stage ${n}.`
          : idx === 3
            ? `You bypassed a required control under time pressure. This is a critical failure.`
            : `Your response partially addressed the situation but missed a clearer policy-aligned explanation.`,
      consequence:
        idx === 1
          ? `Stakeholders stay engaged and the scenario progresses with controls intact.`
          : idx === 3
            ? `An audit flag is raised and trust drops for the next stage.`
            : `The situation continues with unresolved ambiguity.`,
    }));

    return {
      id: stageId,
      simulationId: simId,
      order: n,
      title: `Stage ${n}: Evolving workplace situation`,
      situation: `${input.businessProblem} — decision point ${n}.`,
      characterName: n === 1 ? "Alex Morgan" : n === 2 ? "Sam Rivera" : "Taylor Brooks",
      characterRole: n === 1 ? "Stakeholder" : n === 2 ? "Colleague" : "Specialist",
      characterMessage: `We need a decision on this now. What will you do regarding: ${input.learningObjective}?`,
      decisionPrompt: `Select the most appropriate response for stage ${n}.`,
      policyReference: "Follow organisational policy: verify before committing; escalate when thresholds are met.",
      options,
    };
  });

  const now = new Date().toISOString();
  return {
    id: simId,
    organisationId: ORG,
    title: input.title,
    businessProblem: input.businessProblem,
    targetRoleId: input.targetRoleId,
    learningObjective: input.learningObjective,
    difficulty: input.difficulty,
    estimatedDurationMinutes: input.difficulty === "advanced" ? 20 : input.difficulty === "intermediate" ? 15 : 10,
    scenarioContext: `Demo-generated scenario based on: ${input.businessProblem}`,
    characters: ["Alex Morgan", "Sam Rivera", "Taylor Brooks"],
    employeeResponsibility: "Make policy-aligned decisions under realistic workplace pressure.",
    constraints: ["Do not bypass mandatory controls", "Document escalations"],
    policies: ["Role decision policy", "Escalation threshold guide"],
    assessedCompetencyIds: input.competencyIds,
    competencyWeights: weights,
    passingScore: 70,
    criticalFailureBehaviours: ["Bypassing mandatory controls", "Misrepresenting approval status"],
    performanceBands: {
      ready: [85, 100],
      nearlyReady: [70, 84],
      developmentNeeded: [50, 69],
      highSupport: [0, 49],
    },
    status: "draft",
    stages,
    createdAt: now,
    updatedAt: now,
  };
}
