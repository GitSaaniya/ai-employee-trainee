import { NextResponse } from "next/server";
import { z } from "zod";
import { groqChatJson, getGroqApiKey } from "@/lib/assessment/groq";
import { scoreSystemPrompt, GroqScoreResultSchema, scoreJsonSchema } from "@/lib/assessment/prompts";
import { buildMockAssessmentResult } from "@/lib/assessment/mock-engine";
import { uid } from "@/lib/utils";
import type { Assessment, AssessmentResult, AssessmentTurn } from "@/lib/types";

const BodySchema = z.object({
  sessionId: z.string(),
  assignmentId: z.string(),
  employeeId: z.string(),
  assessment: z.object({
    id: z.string(),
    title: z.string(),
    goal: z.string(),
    roleLabel: z.string(),
    domain: z.string(),
    rubricSkills: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        weight: z.number(),
        descriptors: z.string(),
      })
    ),
  }),
  turns: z.array(
    z.object({
      role: z.enum(["ai", "user", "system"]),
      text: z.string(),
      followUp: z.boolean().optional(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const assessmentStub = {
      id: body.assessment.id,
      organisationId: "org",
      title: body.assessment.title,
      status: "published" as const,
      domain: body.assessment.domain,
      roleLabel: body.assessment.roleLabel,
      audienceMetadata: { region: "", level: "", productFocus: "", locationType: "" },
      goal: body.assessment.goal,
      learnerPersona: "",
      scenario: "",
      persona: { name: "", style: "", voiceNotes: "" },
      durationMinutes: 5,
      coreQuestions: [],
      rubricSkills: body.assessment.rubricSkills,
      adaptiveEnabled: true,
      authoringStep: "deploy" as const,
      refineSubStep: 3 as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies Assessment;

    const turns = body.turns.map((t) => ({
      id: uid("turn"),
      role: t.role,
      text: t.text,
      at: new Date().toISOString(),
      followUp: t.followUp,
    })) as AssessmentTurn[];

    if (!getGroqApiKey()) {
      const demo = buildMockAssessmentResult({
        sessionId: body.sessionId,
        assignmentId: body.assignmentId,
        employeeId: body.employeeId,
        assessment: assessmentStub,
        turns,
      });
      return NextResponse.json({ source: "demo_ai", result: demo });
    }

    try {
      const raw = await groqChatJson<unknown>({
        system: scoreSystemPrompt(),
        user: JSON.stringify({
          assessmentTitle: body.assessment.title,
          goal: body.assessment.goal,
          roleLabel: body.assessment.roleLabel,
          rubricSkills: body.assessment.rubricSkills,
          transcript: body.turns,
        }),
        temperature: 0.2,
        schemaName: "assessment_score",
        jsonSchema: scoreJsonSchema as unknown as Record<string, unknown>,
      });
      const scored = GroqScoreResultSchema.parse(raw);
      const skillScores = body.assessment.rubricSkills.map((rubric) => {
        const match =
          scored.skillScores.find((s) => s.name.toLowerCase() === rubric.name.toLowerCase()) ??
          scored.skillScores.find((s) =>
            s.name.toLowerCase().includes(rubric.name.toLowerCase().split(" ")[0] ?? "")
          );
        return {
          skillId: rubric.id,
          name: rubric.name,
          score: Math.round(match?.score ?? 55),
          evidence: match?.evidence?.length ? match.evidence : [`Limited evidence for ${rubric.name}`],
        };
      });

      const weightSum = body.assessment.rubricSkills.reduce((s, r) => s + r.weight, 0) || 100;
      const weighted = skillScores.reduce((sum, s, i) => {
        const w = body.assessment.rubricSkills[i]?.weight ?? 0;
        return sum + s.score * (w / weightSum);
      }, 0);
      const overallScore = Math.round(
        Number.isFinite(scored.overallScore) ? (scored.overallScore + weighted) / 2 : weighted
      );

      const result: AssessmentResult = {
        id: uid("aresult"),
        sessionId: body.sessionId,
        assignmentId: body.assignmentId,
        employeeId: body.employeeId,
        assessmentId: body.assessment.id,
        overallScore: Math.min(100, Math.max(0, overallScore)),
        skillScores,
        employeeSummary: scored.employeeSummary,
        adminReport: scored.adminReport,
        scoredAt: new Date().toISOString(),
        scoredBy: "groq",
      };
      return NextResponse.json({ source: "groq", result });
    } catch (err) {
      const demo = buildMockAssessmentResult({
        sessionId: body.sessionId,
        assignmentId: body.assignmentId,
        employeeId: body.employeeId,
        assessment: assessmentStub,
        turns,
      });
      return NextResponse.json({
        source: "demo_ai",
        result: demo,
        warning: err instanceof Error ? err.message : "Groq score failed; used demo AI",
      });
    }
  } catch {
    return NextResponse.json({ error: "Failed to score assessment" }, { status: 500 });
  }
}
