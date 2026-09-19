import { NextResponse } from "next/server";
import { z } from "zod";
import { groqChatJson, getGroqApiKey } from "@/lib/assessment/groq";
import { turnSystemPrompt, GroqTurnResultSchema, turnJsonSchema } from "@/lib/assessment/prompts";
import {
  mockFollowUpQuestion,
  mockShouldAskFollowUp,
} from "@/lib/assessment/mock-engine";
import { ensureAssessorUtterance, ensureSituationalQuestion } from "@/lib/assessment/question-guard";

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
            "CRITICAL: Assess the employee ONLY as the assessed role. NEVER ask personal shopping preference questions. NEVER treat them as the shopper. Rewrite any off-path question.",
          forbiddenExamples: [
            "When you think about choosing a shampoo while shopping, what factors are most important to you?",
            "Are there constraints that influence your decision on a shampoo right now?",
          ],
          lastUserAnswer: body.lastUserAnswer,
          currentCoreQuestion: currentCore,
          nextCoreQuestionIfNeeded: nextCore,
          recentTranscript: body.transcript.slice(-12),
        }),
        temperature: 0.35,
        schemaName: "interview_turn",
        jsonSchema: turnJsonSchema as unknown as Record<string, unknown>,
      });
      const result = GroqTurnResultSchema.parse(raw);
      const safeReply = ensureAssessorUtterance(result.reply, roleLabel);

      if (result.action === "next_question" && remainingCore <= 0) {
        if (body.improvisedProbesUsed < body.maxImprovisedProbes) {
          return NextResponse.json({
            source: "groq",
            action: "follow_up",
            reply: safeReply,
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

      if (result.action === "follow_up") {
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
      const reply =
        result.action === "next_question" && nextCore
          ? ensureAssessorUtterance(
              /as the |how would you|shopper|customer/i.test(safeReply)
                ? safeReply.includes(nextCore.slice(0, 24))
                  ? safeReply
                  : `Okay. ${nextCore}`
                : `Okay. ${nextCore}`,
              roleLabel
            )
          : safeReply;

      return NextResponse.json({
        source: "groq",
        action: result.action,
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
