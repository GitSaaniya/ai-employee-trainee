import type { Assessment, AssessmentResult, AssessmentSkillScore, AssessmentTurn } from "@/lib/types";
import { uid } from "@/lib/utils";

const MOCK_ANSWERS = [
  "Hi! I usually open with a friendly smile and ask if they're looking for something specific for their hair today, then mention our new shampoo briefly.",
  "I'd ask what they like or dislike about their current shampoo, whether they deal with dryness or oiliness, and how often they wash their hair.",
  "I'd acknowledge they're busy, agree their brand might work, then offer one clear benefit difference in ten seconds so they can decide quickly.",
  "I'd focus on one benefit—like longer-lasting freshness—and tie it to something they already told me about their routine.",
  "I'd ask if they'd like to try a travel size today, or I can hold one at the counter while they finish shopping.",
];

const FOLLOW_UP_QUESTIONS = [
  "Can you get more specific — what would you say in the first five seconds?",
  "What's one question you'd avoid asking there, and why?",
];

export function mockUserAnswerForQuestion(questionIndex: number): string {
  return MOCK_ANSWERS[questionIndex % MOCK_ANSWERS.length] ?? MOCK_ANSWERS[0];
}

export function mockShouldAskFollowUp(
  _userText: string,
  adaptiveEnabled: boolean,
  used: number
): boolean {
  if (!adaptiveEnabled || used >= 2) return false;
  // Phase 2 demo: one adaptive follow-up after the first core answer
  return used === 0;
}

export function mockFollowUpQuestion(used: number): string {
  return FOLLOW_UP_QUESTIONS[used % FOLLOW_UP_QUESTIONS.length] ?? FOLLOW_UP_QUESTIONS[0];
}

export function buildClosingTurn(personaName: string): AssessmentTurn {
  return {
    id: uid("turn"),
    role: "ai",
    text: `Thanks — that's all I needed today. ${personaName} will wrap up your readiness summary now.`,
    at: new Date().toISOString(),
  };
}

/** Hardcoded Capability-Card style scores for Phase 2 demo. */
export function buildMockAssessmentResult(params: {
  sessionId: string;
  assignmentId: string;
  employeeId: string;
  assessment: Assessment;
  turns: AssessmentTurn[];
}): AssessmentResult {
  const { assessment, turns } = params;
  const userTurns = turns.filter((t) => t.role === "user");

  const defaults = [
    { name: "Objection handling", score: 82 },
    { name: "Discovery questioning", score: 74 },
    { name: "Product knowledge", score: 68 },
    { name: "Closing & next steps", score: 51 },
  ];

  const skillScores: AssessmentSkillScore[] = (assessment.rubricSkills.length
    ? assessment.rubricSkills
    : defaults.map((d, i) => ({
        id: `mock_skill_${i}`,
        name: d.name,
        weight: 25,
        descriptors: "",
      }))
  ).map((skill, i) => {
    const score = defaults[i]?.score ?? 60 + ((i * 7) % 25);
    const evidence = userTurns
      .slice(i, i + 1)
      .map((t) => t.text)
      .filter(Boolean);
    return {
      skillId: skill.id,
      name: skill.name,
      score,
      evidence: evidence.length
        ? evidence
        : [`Demo evidence for ${skill.name} from the mock interview.`],
    };
  });

  const overallScore = Math.round(
    skillScores.reduce((sum, s) => sum + s.score, 0) / Math.max(skillScores.length, 1)
  );

  const top = [...skillScores].sort((a, b) => b.score - a.score);
  const strengths = top.slice(0, 2).map((s) => s.name);
  const gaps = [...skillScores].sort((a, b) => a.score - b.score).slice(0, 2).map((s) => s.name);

  return {
    id: uid("aresult"),
    sessionId: params.sessionId,
    assignmentId: params.assignmentId,
    employeeId: params.employeeId,
    assessmentId: assessment.id,
    overallScore,
    skillScores,
    employeeSummary: `You scored ${overallScore}% overall. Strengths: ${strengths.join(" and ")}. Focus next on ${gaps.join(" and ")}. Keep practicing short, benefit-led pitches under time pressure.`,
    adminReport: `Demo admin report for ${assessment.title}. Overall readiness ${overallScore}%. Rubric breakdown with transcript evidence is available below. Adaptive follow-ups used where answers were shallow. Recommend coaching on ${gaps[0] ?? "closing"} before redeploying to the cohort.`,
    scoredAt: new Date().toISOString(),
    scoredBy: "demo",
  };
}

export function speakText(text: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return null;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.02;
  utter.pitch = 1;
  utter.onend = () => onEnd?.();
  utter.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utter);
  return utter;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
