import { NextResponse } from "next/server";
import { z } from "zod";
import { groqChatJson, getGroqApiKey } from "@/lib/assessment/groq";
import { turnSystemPrompt, GroqTurnResultSchema, turnJsonSchema } from "@/lib/assessment/prompts";
import {
  mockFollowUpQuestion,
  mockShouldAskFollowUp,
} from "@/lib/assessment/mock-engine";
import { ensureAssessorUtterance, ensureSituationalQuestion, isNearDuplicateQuestion, digInFollowUpFromAnswer, questionSimilarity } from "@/lib/assessment/question-guard";

const BodySchema = z.object({
  agentName: z.string().optional(),
  personaName: z.string().optional(),
  employeeName: z.string().min(1),
  topic: z.string().min(1),
  goal: z.string(),
  roleLabel: z.string().optional(),
  scenario: z.string().optional(),
  learnerPersona: z.string().optional(),
  agentGender: z.enum(["female", "male"]).optional(),
  adaptiveEnabled: z.boolean(),
  followUpsUsed: z.number(),
  maxFollowUps: z.number().default(2),
  improvisedProbesUsed: z.number().default(0),
  maxImprovisedProbes: z.number().default(2),
  currentQuestionIndex: z.number(),
  coreQuestions: z.array(z.object({ order: z.number(), text: z.string() })),
  transcript: z.array(
    z.object({
      role: z.enum(["ai", "user", "system"]),
      text: z.string(),
    })
  ),
  lastUserAnswer: z.string(),
});

function demoTurn(body: z.infer<typeof BodySchema> & { agentName: string }) {
  const remaining = Math.max(0, body.coreQuestions.length - (body.currentQuestionIndex + 1));

  if (remaining > 0) {
    if (
      mockShouldAskFollowUp(body.lastUserAnswer, body.adaptiveEnabled, body.followUpsUsed) &&
      body.followUpsUsed < body.maxFollowUps
    ) {
      return {
        action: "follow_up" as const,
        reply: mockFollowUpQuestion(body.followUpsUsed),
        classification: "shallow" as const,
        phase: "core_follow_up" as const,
      };
    }
    const next = body.coreQuestions[body.currentQuestionIndex + 1];
    return {
      action: "next_question" as const,
      reply: `Okay. ${next?.text ?? "Let's continue."}`,
      classification: "sufficient" as const,
      phase: "core" as const,
    };
  }

  if (body.improvisedProbesUsed < body.maxImprovisedProbes) {
    const probes = [
      `You mentioned that approach — what exactly would you say next if they still hesitated?`,
      `Where could that break down under time pressure, and how would you adjust?`,
    ];
    return {
      action: "follow_up" as const,
      reply: probes[body.improvisedProbesUsed % probes.length]!,
      classification: "sufficient" as const,
      phase: "improvised_probe" as const,
    };
  }

  return {
    action: "close" as const,
    reply: `Thanks ${body.employeeName} — that wraps up this assessment.`,
    classification: "sufficient" as const,
    phase: "close" as const,
  };
}

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    const agentName = (body.agentName || body.personaName || "Ishita").trim() || "Ishita";
    const roleLabel = body.roleLabel ?? "";
    const remainingCore = Math.max(0, body.coreQuestions.length - (body.currentQuestionIndex + 1));
    const sanitizedCores = body.coreQuestions.map((q) => ({
      ...q,
      text: ensureSituationalQuestion(q.text, roleLabel),
    }));
    const normalized = {
      ...body,
      agentName,
      roleLabel,
      coreQuestions: sanitizedCores,
    };
    const coresDone = remainingCore <= 0;

    if (!getGroqApiKey()) {
      const demo = demoTurn(normalized);
      return NextResponse.json({
        source: "demo_ai",
        ...demo,
        reply: ensureAssessorUtterance(demo.reply, roleLabel),
      });
    }

    try {
      const nextCore =
        remainingCore > 0 ? sanitizedCores[body.currentQuestionIndex + 1]?.text : null;
      const currentCore = sanitizedCores[body.currentQuestionIndex]?.text ?? null;
      const alreadyAskedByYou = body.transcript
        .filter((t) => t.role === "ai")
        .map((t) => t.text)
        .filter(Boolean);
      const doNotRepeat = [...alreadyAskedByYou, currentCore].filter((t): t is string =>
        Boolean(t?.trim())
      );

      const raw = await groqChatJson<unknown>({
        system: turnSystemPrompt({
          agentName,
          employeeName: body.employeeName,
          topic: body.topic,
          goal: body.goal,
          roleLabel,
          scenario: body.scenario ?? "",
          learnerPersona: body.learnerPersona ?? "",
          agentGender: body.agentGender ?? "female",
          adaptiveEnabled: body.adaptiveEnabled,
          followUpsUsed: body.followUpsUsed,
          maxFollowUps: body.maxFollowUps,
          improvisedProbesUsed: body.improvisedProbesUsed,
          maxImprovisedProbes: body.maxImprovisedProbes,
          remainingCore,
          currentQuestionIndex: body.currentQuestionIndex,
          totalQuestions: sanitizedCores.length,
        }),
        user: JSON.stringify({
          agentName,
          employeeName: body.employeeName,
          assessedRole: roleLabel || "assessed role",
          scenario: body.scenario || body.topic,
          topic: body.topic,
          coresComplete: coresDone,
          improvisedProbesRemaining: Math.max(
            0,
            body.maxImprovisedProbes - body.improvisedProbesUsed
          ),
          reminder:
            "CRITICAL: Assess the employee ONLY as the assessed role. NEVER ask personal shopping preference questions. NEVER treat them as the shopper. Rewrite any off-path question. NEVER repeat or paraphrase a question you already asked unless they explicitly ask you to repeat. follow_up must NOT paraphrase nextCoreQuestionIfNeeded; dig into their last answer instead.",
          forbiddenExamples: [
            "When you think about choosing a shampoo while shopping, what factors are most important to you?",
            "Are there constraints that influence your decision on a shampoo right now?",
          ],
          lastUserAnswer: body.lastUserAnswer,
          currentCoreQuestion: currentCore,
          nextCoreQuestionIfNeeded: nextCore,
          alreadyAskedByYou,
          doNotRepeat,
          recentTranscript: body.transcript.slice(-12),
        }),
        temperature: 0.35,
        schemaName: "interview_turn",
        jsonSchema: turnJsonSchema as unknown as Record<string, unknown>,
      });
      const result = GroqTurnResultSchema.parse(raw);
      let safeReply = ensureAssessorUtterance(result.reply, roleLabel);
      let action = result.action;

      // Hard guard: never re-ask a near-paraphrase of a prior AI question
      const priorForDup = alreadyAskedByYou;
      if (action !== "close" && isNearDuplicateQuestion(safeReply, priorForDup)) {
        if (action === "follow_up" && remainingCore > 0 && nextCore) {
          // Follow-up restated something already asked / next core — advance instead
          action = "next_question";
          safeReply = ensureAssessorUtterance(`Okay. ${nextCore}`, roleLabel);
        } else if (action === "follow_up") {
          safeReply = ensureAssessorUtterance(
            digInFollowUpFromAnswer(body.lastUserAnswer, roleLabel),
            roleLabel
          );
          // If dig-in still overlaps, force a different probe angle
          if (isNearDuplicateQuestion(safeReply, priorForDup)) {
            safeReply = ensureAssessorUtterance(
              `Thanks. What would you do differently if they pushed back on price right then?`,
              roleLabel
            );
          }
        } else if (action === "next_question" && nextCore) {
          safeReply = ensureAssessorUtterance(`Okay. ${nextCore}`, roleLabel);
          // Next core itself may overlap the last follow-up — reframe to a distinct angle
          if (isNearDuplicateQuestion(safeReply, priorForDup)) {
            const reframes = [
              `Thanks — you covered that. If they still looked unsure, what would you ask next that you haven't tried yet?`,
              `Got it. What's one constraint you'd check before recommending anything?`,
              `Alright. How would you handle it if they said they already have a brand they like?`,
            ];
            const pick =
              reframes.find((r) => !isNearDuplicateQuestion(r, priorForDup)) ?? reframes[0]!;
            safeReply = ensureAssessorUtterance(pick, roleLabel);
          }
        }
      }

      // Follow-ups must not steal the next core question's content
      if (
        action === "follow_up" &&
        !coresDone &&
        nextCore &&
        questionSimilarity(safeReply, nextCore) >= 0.72
      ) {
        action = "next_question";
        safeReply = ensureAssessorUtterance(`Okay. ${nextCore}`, roleLabel);
        if (isNearDuplicateQuestion(safeReply, priorForDup)) {
          safeReply = ensureAssessorUtterance(
            digInFollowUpFromAnswer(body.lastUserAnswer, roleLabel),
            roleLabel
          );
          action = "follow_up";
        }
      }

      if (action === "next_question" && remainingCore <= 0) {
        if (body.improvisedProbesUsed < body.maxImprovisedProbes) {
          let probeReply = safeReply;
          if (isNearDuplicateQuestion(probeReply, priorForDup)) {
            probeReply = ensureAssessorUtterance(
              digInFollowUpFromAnswer(body.lastUserAnswer, roleLabel),
              roleLabel
            );
          }
          return NextResponse.json({
            source: "groq",
            action: "follow_up",
            reply: probeReply,
            classification: result.classification,
            phase: "improvised_probe",
          });
        }
        return NextResponse.json({
          source: "groq",
          action: "close",
          reply: ensureAssessorUtterance(
            result.reply || demoTurn(normalized).reply,
            roleLabel
          ),
          classification: result.classification,
          phase: "close",
        });
      }

      if (action === "follow_up") {
        if (!coresDone && body.followUpsUsed >= body.maxFollowUps) {
          const demo = demoTurn({ ...normalized, adaptiveEnabled: false });
          return NextResponse.json({
            source: "groq",
            ...demo,
            reply: ensureAssessorUtterance(demo.reply, roleLabel),
          });
        }
        if (coresDone && body.improvisedProbesUsed >= body.maxImprovisedProbes) {
          return NextResponse.json({
            source: "groq",
            action: "close",
            reply: ensureAssessorUtterance(
              `Thank you, ${body.employeeName}. That concludes this assessment.`,
              roleLabel
            ),
            classification: result.classification,
            phase: "close",
          });
        }
        return NextResponse.json({
          source: "groq",
          action: "follow_up",
          reply: safeReply,
          classification: result.classification,
          phase: coresDone ? "improvised_probe" : "core_follow_up",
        });
      }

      // Prefer sanitized next core text if model drifted into buyer-perspective wording
      let reply =
        action === "next_question" && nextCore
          ? ensureAssessorUtterance(
              /as the |how would you|shopper|customer/i.test(safeReply)
                ? safeReply.includes(nextCore.slice(0, 24))
                  ? safeReply
                  : `Okay. ${nextCore}`
                : `Okay. ${nextCore}`,
              roleLabel
            )
          : safeReply;

      // Final dup check after core injection
      if (action === "next_question" && isNearDuplicateQuestion(reply, priorForDup)) {
        const pick =
          [
            `Thanks — moving on. How would you present the key benefit in about thirty seconds?`,
            `Alright. If they're still undecided, how would you close or set a next step?`,
            `Got it. What would you say if they pushed back on price?`,
          ].find((r) => !isNearDuplicateQuestion(r, priorForDup)) ??
          `Thanks. What would you do next in that moment?`;
        reply = ensureAssessorUtterance(pick, roleLabel);
      }

      return NextResponse.json({
        source: "groq",
        action,
        reply,
        classification: result.classification,
        phase: coresDone ? "close" : "core",
      });
    } catch (err) {
      const demo = demoTurn(normalized);
      return NextResponse.json({
        source: "demo_ai",
        ...demo,
        reply: ensureAssessorUtterance(demo.reply, roleLabel),
        warning: err instanceof Error ? err.message : "Groq turn failed; used demo AI",
      });
    }
  } catch {
    return NextResponse.json({ error: "Failed to process turn" }, { status: 500 });
  }
}
