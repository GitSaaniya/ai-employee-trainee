import { NextResponse } from "next/server";
import { z } from "zod";
import { groqChatJson, getGroqApiKey } from "@/lib/assessment/groq";
import { generateSystemPrompt, GroqGenerateResultSchema, generateJsonSchema } from "@/lib/assessment/prompts";
import { mockGenerateAssessmentContent } from "@/lib/assessment/mock-generate";
import { uid } from "@/lib/utils";
import type { Assessment } from "@/lib/types";

const BodySchema = z.object({
  assessment: z.object({
    id: z.string(),
    title: z.string(),
    domain: z.string(),
    roleLabel: z.string(),
    goal: z.string(),
    learnerPersona: z.string().optional(),
    scenario: z.string().optional(),
    durationMinutes: z.number().optional(),
    adaptiveEnabled: z.boolean().optional(),
    audienceMetadata: z
      .object({
        region: z.string(),
        level: z.string(),
        productFocus: z.string(),
        locationType: z.string(),
      })
      .optional(),
    persona: z
      .object({
        name: z.string(),
        style: z.string(),
        voiceNotes: z.string(),
      })
      .optional(),
  }),
});

function toAssessmentFields(raw: z.infer<typeof GroqGenerateResultSchema>) {
  const weightSum = raw.rubricSkills.reduce((s, x) => s + x.weight, 0) || 100;
  return {
    persona: raw.persona,
    coreQuestions: raw.coreQuestions
      .sort((a, b) => a.order - b.order)
      .map((q) => ({
        id: uid("aq"),
        order: q.order,
        text: q.text,
      })),
    rubricSkills: raw.rubricSkills.map((s) => ({
      id: uid("ars"),
      name: s.name,
      weight: Math.round((s.weight / weightSum) * 100),
      descriptors: s.descriptors,
    })),
  };
}

export async function POST(request: Request) {
  try {
    const body = BodySchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid input", details: body.error.flatten() }, { status: 400 });
    }

    const a = body.data.assessment;
    const stub = {
      id: a.id,
      organisationId: "org",
      title: a.title,
      status: "draft" as const,
      domain: a.domain,
      roleLabel: a.roleLabel,
      audienceMetadata: a.audienceMetadata ?? {
        region: "",
        level: "",
        productFocus: "",
        locationType: "",
      },
      goal: a.goal,
      learnerPersona: a.learnerPersona ?? "",
      scenario: a.scenario ?? "",
      persona: a.persona ?? { name: "", style: "", voiceNotes: "" },
      durationMinutes: a.durationMinutes ?? 5,
      coreQuestions: [],
      rubricSkills: [],
      adaptiveEnabled: a.adaptiveEnabled ?? true,
      authoringStep: "generate" as const,
      refineSubStep: 3 as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies Assessment;

    if (!getGroqApiKey()) {
      const demo = mockGenerateAssessmentContent(stub);
      return NextResponse.json({ source: "demo_ai", ...demo });
    }

    try {
      const raw = await groqChatJson<unknown>({
        system: generateSystemPrompt(),
        user: JSON.stringify({
          title: a.title,
          domain: a.domain,
          roleLabel: a.roleLabel,
          goal: a.goal,
          learnerPersona: a.learnerPersona,
          scenario: a.scenario,
          audienceMetadata: a.audienceMetadata,
          durationMinutes: a.durationMinutes ?? 5,
          existingPersona: a.persona,
          roleContract: {
            employeePerforms: a.roleLabel || "the assessed job in the scenario",
            aiIs: "interviewer/assessor only — never performs the assessed job",
            critical:
              "Situational judgment assessment. Never immersive customer chat. Never ask what brings the employee to the aisle. Present situations and ask how they would handle them as the assessed role.",
            example:
              "Shampoo mall scenario: employee = shopkeeper/sales associate; AI asks how they would approach customers, discover needs, and sell — AI does not act as shopkeeper or shopper.",
          },
        }),
        temperature: 0.4,
        schemaName: "assessment_pack",
        jsonSchema: generateJsonSchema as unknown as Record<string, unknown>,
      });
      const parsed = GroqGenerateResultSchema.parse(raw);
      return NextResponse.json({ source: "groq", ...toAssessmentFields(parsed) });
    } catch (err) {
      const demo = mockGenerateAssessmentContent(stub);
      return NextResponse.json({
        source: "demo_ai",
        ...demo,
        warning: err instanceof Error ? err.message : "Groq generate failed; used demo AI",
      });
    }
  } catch {
    return NextResponse.json({ error: "Failed to generate assessment" }, { status: 500 });
  }
}
