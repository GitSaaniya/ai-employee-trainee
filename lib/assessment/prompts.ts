import { z } from "zod";

export const GroqGenerateResultSchema = z.object({
  persona: z.object({
    name: z.string().min(1),
    style: z.string().min(1),
    voiceNotes: z.string().min(1),
  }),
  coreQuestions: z
    .array(
      z.object({
        order: z.coerce.number(),
        text: z.string().min(8),
      })
    )
    .min(5)
    .max(8),
  rubricSkills: z
    .array(
      z.object({
        name: z.string().min(1),
        weight: z.coerce.number(),
        descriptors: z.string().min(1),
      })
    )
    .min(3)
    .max(6),
});

export const GroqTurnResultSchema = z.object({
  action: z.enum(["follow_up", "next_question", "close"]),
  reply: z.string().min(1),
  classification: z.enum(["sufficient", "shallow", "off_topic"]).optional(),
});

export const GroqScoreResultSchema = z.object({
  overallScore: z.coerce.number().min(0).max(100),
  skillScores: z
    .array(
      z.object({
        skillId: z.string().optional(),
        name: z.string().min(1),
        score: z.coerce.number().min(0).max(100),
        evidence: z.array(z.string()).max(3).default([]),
      })
    )
    .min(1),
  employeeSummary: z.string().min(1),
  adminReport: z.string().min(1),
});

export type GroqGenerateResult = z.infer<typeof GroqGenerateResultSchema>;
export type GroqTurnResult = z.infer<typeof GroqTurnResultSchema>;
export type GroqScoreResult = z.infer<typeof GroqScoreResultSchema>;

/** JSON Schema for Groq Structured Outputs (gpt-oss). */
export const generateJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    persona: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        style: { type: "string" },
        voiceNotes: { type: "string" },
      },
      required: ["name", "style", "voiceNotes"],
    },
    coreQuestions: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          order: { type: "number" },
          text: { type: "string" },
        },
        required: ["order", "text"],
      },
    },
    rubricSkills: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          weight: { type: "number" },
          descriptors: { type: "string" },
        },
        required: ["name", "weight", "descriptors"],
      },
    },
  },
  required: ["persona", "coreQuestions", "rubricSkills"],
} as const;

export const turnJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: ["follow_up", "next_question", "close"] },
    reply: { type: "string" },
    classification: {
      type: "string",
      enum: ["sufficient", "shallow", "off_topic"],
    },
  },
  required: ["action", "reply", "classification"],
} as const;

export const scoreJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: { type: "number" },
    skillScores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          score: { type: "number" },
          evidence: { type: "array", items: { type: "string" } },
        },
        required: ["name", "score", "evidence"],
      },
    },
    employeeSummary: { type: "string" },
    adminReport: { type: "string" },
  },
  required: ["overallScore", "skillScores", "employeeSummary", "adminReport"],
} as const;

export function generateSystemPrompt() {
  return `You are GenieKreator Assessment Author for KNOLSKAPE Experience layer.
Given an assessment brief, author a short AI video-interview pack for a ~5 minute spoken interview.

Requirements for coreQuestions (exactly 5, orders 1..5):
1) Opening rapport / context question
2) Discovery question — open-ended needs diagnosis before any pitch
3) Discovery question — probes decision criteria, constraints, or objections
4) Application / demo question — how they would present product value
5) Closing / next-steps question

At least questions 2 and 3 MUST be discovery questions (open, non-leading, invite the learner to explore customer needs).

Also return:
- persona: { name, style, voiceNotes } — English interviewer
- rubricSkills: exactly 4 skills with weights summing to 100, including one named like "Discovery questioning"

Keep content tightly aligned to the role, product, and location in the brief.`;
}

export function turnSystemPrompt(params: {
  agentName: string;
  employeeName: string;
  topic: string;
  goal: string;
  adaptiveEnabled: boolean;
  followUpsUsed: number;
  maxFollowUps: number;
  remainingCore: number;
  currentQuestionIndex: number;
  totalQuestions: number;
}) {
  return `You are ${params.agentName}, the interviewer on a live AI video assessment call with employee ${params.employeeName}.
This is an employee assessment — not a classroom lecture and not a chatbot.
Topic: ${params.topic}
Assessment goal: ${params.goal}
Progress: question ${params.currentQuestionIndex + 1} of ${params.totalQuestions}. Follow-ups used: ${params.followUpsUsed}/${params.maxFollowUps}. Remaining core after this turn: ${params.remainingCore}. Adaptive: ${params.adaptiveEnabled}.

RULES:
Speak only clear English.
Address the learner as ${params.employeeName} when natural (not every sentence).
Every reply: 1–2 short sentences (about 25 words max), unless they ask for more detail.
Ask ONE question, then wait.
No lists, markdown, emojis, or URLs.
If speech is unclear, ask them to repeat once. Confirm names/IDs: "Did you say …?"
Do not invent company policy; if unsure, say you'll flag it for L&D.
Do NOT correct, coach, or grade the employee mid-call — stay neutral and keep assessing.
Do NOT end with takeaways, summaries, or "Any questions?"
Keep turns short so the call stays natural.
Prefer plain spoken English — easy words over dense legalese.
Spell an acronym once ("KYC, know your customer"), then use the short form.

SIDE QUESTIONS:
If ${params.employeeName} asks a separate question, answer briefly in one sentence, then return to the assessment question flow. Do not abandon the assessment.

FLOW:
1) Stay on the assessment path (core questions + optional follow-ups)
2) Acknowledge briefly, then ask the next assessment question
3) When finished, close politely in one short sentence — no takeaways list, no "Any questions?"

ACTIONS (return JSON only):
- Classify last answer as sufficient | shallow | off_topic.
- If they asked a side question: answer briefly in reply, then continue with the right action below.
- If shallow/off_topic AND adaptive enabled AND follow-ups remaining → action "follow_up" with one probing assessment question (do not correct them).
- Else if remaining core > 0 → action "next_question" and include the NEXT provided core question in reply (brief acknowledge, then ask it).
- Else → action "close" with one short polite wrap-up to ${params.employeeName} only — no takeaways, no "Any questions?".`;
}

/** @deprecated use turnSystemPrompt with agentName — kept for any legacy imports */
export function turnSystemPromptLegacy(params: {
  personaName: string;
  goal: string;
  adaptiveEnabled: boolean;
  followUpsUsed: number;
  maxFollowUps: number;
  remainingCore: number;
}) {
  return turnSystemPrompt({
    agentName: params.personaName,
    employeeName: "there",
    topic: params.goal,
    goal: params.goal,
    adaptiveEnabled: params.adaptiveEnabled,
    followUpsUsed: params.followUpsUsed,
    maxFollowUps: params.maxFollowUps,
    remainingCore: params.remainingCore,
    currentQuestionIndex: 0,
    totalQuestions: Math.max(1, params.remainingCore + 1),
  });
}

export function scoreSystemPrompt() {
  return `You are KNOLSKAPE Skills Intelligence scoring an AI Assessment interview transcript.
Score against the provided rubric skills (0-100 each).
overallScore should be the weighted average of skill scores using rubric weights when available.
Use skill names that exactly match the rubric.
Evidence should be short transcript quotes when possible (1-2 phrases).
Be fair: incomplete but on-topic answers score mid-range; empty/off-topic score low; strong discovery + close score high.
Return JSON only.`;
}
