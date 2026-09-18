import { NextResponse } from "next/server";
import { z } from "zod";
import { groqChatJson, getGroqApiKey } from "@/lib/assessment/groq";
import { turnSystemPrompt, GroqTurnResultSchema, turnJsonSchema } from "@/lib/assessment/prompts";
import {
  mockFollowUpQuestion,
  mockShouldAskFollowUp,
} from "@/lib/assessment/mock-engine";

const BodySchema = z.object({
  agentName: z.string().optional(),
  personaName: z.string().optional(),
  employeeName: z.string().min(1),
  topic: z.string().min(1),
  goal: z.string(),
  adaptiveEnabled: z.boolean(),
  followUpsUsed: z.number(),
  maxFollowUps: z.number().default(2),
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
  if (
    mockShouldAskFollowUp(body.lastUserAnswer, body.adaptiveEnabled, body.followUpsUsed) &&
    body.followUpsUsed < body.maxFollowUps
  ) {
    return {
      action: "follow_up" as const,
      reply: mockFollowUpQuestion(body.followUpsUsed),
      classification: "shallow" as const,
    };
  }
  if (remaining > 0) {
    const next = body.coreQuestions[body.currentQuestionIndex + 1];
    return {
      action: "next_question" as const,
      reply: `Got it, ${body.employeeName}. ${next?.text ?? "Let's continue."}`,
      classification: "sufficient" as const,
    };
  }
  return {
    action: "close" as const,
    reply: `Thanks ${body.employeeName} — that wraps up this assessment call.`,
    classification: "sufficient" as const,
  };
}

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    const agentName = (body.agentName || body.personaName || "Maya").trim() || "Maya";
    const remainingCore = Math.max(0, body.coreQuestions.length - (body.currentQuestionIndex + 1));
    const normalized = { ...body, agentName };

    if (!getGroqApiKey()) {
      return NextResponse.json({ source: "demo_ai", ...demoTurn(normalized) });
    }

    try {
      const nextCore =
        remainingCore > 0 ? body.coreQuestions[body.currentQuestionIndex + 1]?.text : null;
      const currentCore = body.coreQuestions[body.currentQuestionIndex]?.text ?? null;
      const raw = await groqChatJson<unknown>({
        system: turnSystemPrompt({
          agentName,
          employeeName: body.employeeName,
          topic: body.topic,
          goal: body.goal,
          adaptiveEnabled: body.adaptiveEnabled,
          followUpsUsed: body.followUpsUsed,
          maxFollowUps: body.maxFollowUps,
          remainingCore,
          currentQuestionIndex: body.currentQuestionIndex,
          totalQuestions: body.coreQuestions.length,
        }),
        user: JSON.stringify({
          agentName,
          employeeName: body.employeeName,
          topic: body.topic,
          lastUserAnswer: body.lastUserAnswer,
          currentCoreQuestion: currentCore,
          nextCoreQuestionIfNeeded: nextCore,
          recentTranscript: body.transcript.slice(-10),
        }),
        temperature: 0.45,
        schemaName: "interview_turn",
        jsonSchema: turnJsonSchema as unknown as Record<string, unknown>,
      });
      const result = GroqTurnResultSchema.parse(raw);
      if (result.action === "next_question" && remainingCore <= 0) {
        return NextResponse.json({
          source: "groq",
          action: "close",
          reply: result.reply || demoTurn(normalized).reply,
          classification: result.classification,
        });
      }
      if (result.action === "follow_up" && body.followUpsUsed >= body.maxFollowUps) {
        return NextResponse.json({
          source: "groq",
          ...demoTurn({ ...normalized, adaptiveEnabled: false }),
        });
      }
      return NextResponse.json({ source: "groq", ...result });
    } catch (err) {
      return NextResponse.json({
        source: "demo_ai",
        ...demoTurn(normalized),
        warning: err instanceof Error ? err.message : "Groq turn failed; used demo AI",
      });
    }
  } catch {
    return NextResponse.json({ error: "Failed to process turn" }, { status: 500 });
  }
}
