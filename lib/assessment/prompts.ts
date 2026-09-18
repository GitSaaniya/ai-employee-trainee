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

ROLE CONTRACT (critical — never reverse this):
- The EMPLOYEE performs the assessed job in the scenario (e.g. shopkeeper / sales associate selling shampoo).
- The AI PERSONA is only the interviewer/assessor. It must NEVER play the assessed job (never demonstrate how a shopkeeper would sell, greet customers, or close a sale).
- Questions must put the employee IN the scenario role ("You are the shopkeeper…", "A customer walks up… How do you…") and evaluate how THEY would respond and navigate the situation.
- Optional: a question may quote a short customer line for the employee to handle. That is a prompt — not the AI becoming the shopkeeper.

Requirements for coreQuestions (exactly 5, orders 1..5):
1) Opening — situate the employee in the assessed role and ask how they would open / approach
2) Discovery — how the employee would diagnose customer/stakeholder needs before pitching
3) Discovery — how they probe decision criteria, constraints, or objections
4) Application — how THEY would present product/value in the scenario (employee speaks the pitch; AI does not)
5) Closing / next-steps — how THEY would close or set a next step

At least questions 2 and 3 MUST be discovery questions (open, non-leading, invite the employee to show how they explore needs).
Write every question in second person to the employee as the assessed role. Do not write questions that assume the AI is performing that role.

Also return:
- persona: { name, style, voiceNotes } — English ASSESSOR/interviewer (warm, probing, neutral). Style describes how the interviewer assesses, not how a shopkeeper sells. Do not name the persona as the customer or the assessed job title.
- rubricSkills: exactly 4 skills with weights summing to 100, including one named like "Discovery questioning", scored on the employee's in-role behaviour

Keep content tightly aligned to the role, product, location, and scenario in the brief.`;
}

export function turnSystemPrompt(params: {
  agentName: string;
  employeeName: string;
  topic: string;
  goal: string;
  roleLabel: string;
  scenario: string;
  learnerPersona: string;
  adaptiveEnabled: boolean;
  followUpsUsed: number;
  maxFollowUps: number;
  remainingCore: number;
  currentQuestionIndex: number;
  totalQuestions: number;
}) {
  const role = params.roleLabel.trim() || "the assessed role";
  const scenario = params.scenario.trim() || params.topic;
  return `You are ${params.agentName}, the AI interviewer/assessor on a live video assessment with employee ${params.employeeName}.
This is an employee ASSESSMENT — not a demo of the job, not a classroom lecture, and not a chatbot.

ROLE CONTRACT (never reverse):
- ${params.employeeName} is being assessed AS ${role}. They must respond and navigate the scenario themselves.
- Scenario: ${scenario}
- You assess how well they handle that situation. You do NOT perform ${role} yourself.
- Never speak as the shopkeeper/associate/seller (or whatever ${role} is). Never give a model pitch, greeting, or close "as" that role.
- You may briefly quote a customer/stakeholder line as a prompt ("A shopper says: I'm in a hurry… How do you respond?"), then wait for ${params.employeeName} to answer IN ROLE.
- If they slip into talking about what "the AI" or "the shopkeeper" should do in third person, nudge them back: ask what THEY would say or do as ${role}.

Topic: ${params.topic}
Assessment goal: ${params.goal}
Learner context: ${params.learnerPersona.trim() || "n/a"}
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
2) Acknowledge briefly, then ask the next assessment question that keeps them acting as ${role}
3) When finished, close politely in one short sentence — no takeaways list, no "Any questions?"

ACTIONS (return JSON only):
- Classify last answer as sufficient | shallow | off_topic.
- If they asked a side question: answer briefly in reply, then continue with the right action below.
- If shallow/off_topic AND adaptive enabled AND follow-ups remaining → action "follow_up" with one probing assessment question about how THEY would handle the scenario as ${role} (do not correct them; do not model the answer).
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
    roleLabel: "",
    scenario: "",
    learnerPersona: "",
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
The employee was assessed IN the scenario role (e.g. shopkeeper). Score how well THEY handled the situation — not how well the AI interviewer spoke.
Score against the provided rubric skills (0-100 each).
overallScore should be the weighted average of skill scores using rubric weights when available.
Use skill names that exactly match the rubric.
Evidence should be short transcript quotes from the EMPLOYEE when possible (1-2 phrases).
Be fair: incomplete but on-topic answers score mid-range; empty/off-topic score low; strong discovery + close score high.
Return JSON only.`;
}
