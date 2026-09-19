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

CRITICAL — assessment design (never violate):
- This is a SITUATIONAL JUDGMENT assessment. Present realistic workplace situations, then ask how the EMPLOYEE would respond, decide, communicate, and handle them.
- Do NOT write live in-scene roleplay where the AI or employee is immersed as a customer/shopper chatting in the aisle.
- CRITICAL: Never write questions like "What brings you to the beauty aisle today?" or "Tell me about your day at the mall" — those treat the employee as the customer and are OFF PATH.
- CRITICAL: The AI persona is an interviewer/assessor only. It must NEVER play the assessed job (shopkeeper/sales associate) and must NEVER stay in character as the customer for the whole interview.
- Correct pattern: "A busy shopper pauses near the new shampoo. As the sales associate, how would you approach them and open the conversation?"
- Wrong pattern: asking the employee questions a shopkeeper would ask a shopper.

ROLE CONTRACT (CRITICAL — never reverse):
- EMPLOYEE = assessed job in the scenario (e.g. shopkeeper selling shampoo).
- AI PERSONA = assessor who evaluates judgment, decision-making, communication, and approach.
- Optional: one short quoted customer line as a prompt ("A shopper says: I'm in a hurry… How do you respond?") — then wait. That is NOT immersive roleplay.

Requirements for coreQuestions (exactly 5, orders 1..5):
1) Opening — present a situation; ask how the employee would approach / open
2) Discovery — how they would diagnose needs before pitching
3) Discovery — how they handle criteria, constraints, or objections
4) Application — how THEY would present product/value (employee speaks; AI does not model it)
5) Closing / next-steps — how THEY would close or set a next step

At least questions 2 and 3 MUST be discovery-style situational questions.
Write every question in second person to the employee as the assessed role, as judgment prompts about a situation.

Also return:
- persona: { name, style, voiceNotes } — English ASSESSOR/interviewer. CRITICAL: style must describe how the interviewer assesses (probing, neutral), NEVER "mall shopper", "customer", or the assessed job title.
- rubricSkills: exactly 4 skills with weights summing to 100, including one named like "Discovery questioning"

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

CRITICAL — stay on path (never violate):
- This call evaluates how ${params.employeeName} would RESPOND TO and HANDLE workplace scenarios as ${role} — judgment, decision-making, communication, and approach.
- CRITICAL: You are NOT placed inside the scenario. Do NOT roleplay as a customer, shopper, or ${role}. Do NOT ask immersive customer questions ("What brings you to the aisle?", "Tell me about your day at the mall").
- CRITICAL: Present situations ("A shopper says they are in a hurry…"), then ask what ${params.employeeName} would do or say as ${role}. Then wait.
- CRITICAL: Never demonstrate the job (never give a model pitch/greeting/close as ${role}). Never slide into live aisle chat.
- If a provided core question sounds like customer immersion, REWRITE it into a situational assessor question before asking it.

ROLE CONTRACT:
- ${params.employeeName} is assessed AS ${role}. Scenario context: ${scenario}
- You may quote one short customer/stakeholder line as a prompt, then ask how they would handle it — that is all.

Topic: ${params.topic}
Assessment goal: ${params.goal}
Learner context: ${params.learnerPersona.trim() || "n/a"}
Progress: question ${params.currentQuestionIndex + 1} of ${params.totalQuestions}. Follow-ups used: ${params.followUpsUsed}/${params.maxFollowUps}. Remaining core after this turn: ${params.remainingCore}. Adaptive: ${params.adaptiveEnabled}.

RULES:
Speak only clear English.
Address the learner as ${params.employeeName} when natural (not every sentence).
Every reply: 1–2 short sentences (about 25 words max), unless they ask for more detail.
Ask ONE situational question, then wait.
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
1) Stay on the assessment path (core questions + optional follow-ups) as situational judgment prompts
2) Acknowledge briefly, then ask the next assessor question about how they would handle the situation as ${role}
3) When finished, close politely in one short sentence — no takeaways list, no "Any questions?"

ACTIONS (return JSON only):
- Classify last answer as sufficient | shallow | off_topic.
- If they asked a side question: answer briefly in reply, then continue with the right action below.
- If shallow/off_topic AND adaptive enabled AND follow-ups remaining → action "follow_up" with one probing situational question about how THEY would handle it as ${role} (do not correct; do not model the answer; CRITICAL: stay off immersive roleplay).
- Else if remaining core > 0 → action "next_question" and include the NEXT provided core question in reply (or a CRITICAL rewrite if it was immersive), brief acknowledge then ask it.
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
CRITICAL: Score how the EMPLOYEE would handle workplace scenarios (judgment, decisions, communication, approach) — not immersive roleplay quality, and not the AI interviewer.
The employee was assessed as the scenario role (e.g. shopkeeper). Prefer evidence from EMPLOYEE turns.
Score against the provided rubric skills (0-100 each).
overallScore should be the weighted average of skill scores using rubric weights when available.
Use skill names that exactly match the rubric.
Evidence should be short transcript quotes from the EMPLOYEE when possible (1-2 phrases).
Be fair: incomplete but on-topic answers score mid-range; empty/off-topic score low; strong discovery + close score high.
Return JSON only.`;
}
