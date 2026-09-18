import { z } from "zod";
import { NextResponse } from "next/server";
import { GenerateSimulationInputSchema } from "@/lib/types";
import { mockGenerateSimulation } from "@/lib/ai/mock-generator";
import { uid } from "@/lib/utils";

const ResponseOptionSchema = z.object({
  id: z.string(),
  stageId: z.string(),
  label: z.string(),
  text: z.string(),
  score: z.number(),
  isBest: z.boolean(),
  isCriticalFailure: z.boolean(),
  competencyImpacts: z.record(z.number()),
  feedback: z.string(),
  consequence: z.string(),
  nextStageModifier: z.string().optional(),
});

const SimulationStageSchema = z.object({
  id: z.string(),
  simulationId: z.string(),
  order: z.number(),
  title: z.string(),
  situation: z.string(),
  characterName: z.string(),
  characterRole: z.string(),
  characterMessage: z.string(),
  decisionPrompt: z.string(),
  policyReference: z.string().optional(),
  options: z.array(ResponseOptionSchema).min(2),
});

const SimulationSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  title: z.string(),
  businessProblem: z.string(),
  targetRoleId: z.string(),
  learningObjective: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedDurationMinutes: z.number(),
  scenarioContext: z.string(),
  characters: z.array(z.string()),
  employeeResponsibility: z.string(),
  constraints: z.array(z.string()),
  policies: z.array(z.string()),
  assessedCompetencyIds: z.array(z.string()),
  competencyWeights: z.record(z.number()),
  passingScore: z.number(),
  criticalFailureBehaviours: z.array(z.string()),
  performanceBands: z.object({
    ready: z.tuple([z.number(), z.number()]),
    nearlyReady: z.tuple([z.number(), z.number()]),
    developmentNeeded: z.tuple([z.number(), z.number()]),
    highSupport: z.tuple([z.number(), z.number()]),
  }),
  status: z.enum(["draft", "published", "archived"]),
  stages: z.array(SimulationStageSchema).min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

async function generateWithOpenAI(input: z.infer<typeof GenerateSimulationInputSchema>) {
  const simId = uid("sim");
  const now = new Date().toISOString();
  const weights = Object.fromEntries(
    input.competencyIds.map((id, i) => [
      id,
      Math.round(100 / input.competencyIds.length) + (i === 0 ? 100 % input.competencyIds.length : 0),
    ])
  );

  const system = `You are SkillSim AI, generating workplace decision simulations for enterprise training.
Return ONLY valid JSON matching this Simulation shape. Use id "${simId}", organisationId "org_meridian",
status "draft", createdAt and updatedAt "${now}", targetRoleId "${input.targetRoleId}",
assessedCompetencyIds ${JSON.stringify(input.competencyIds)}, competencyWeights ${JSON.stringify(weights)},
passingScore 70, performanceBands ready [85,100], nearlyReady [70,84], developmentNeeded [50,69], highSupport [0,49].
Include 3 stages, each with 4 options (A-D). Exactly one option per stage isBest=true; include one critical-failure option overall.
Each option needs competencyImpacts for every assessed competency (0-100), feedback, and consequence.`;

  const user = JSON.stringify({
    title: input.title,
    businessProblem: input.businessProblem,
    learningObjective: input.learningObjective,
    difficulty: input.difficulty,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  const parsed = JSON.parse(content);
  return SimulationSchema.parse(parsed);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = GenerateSimulationInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const simulation = await generateWithOpenAI(parsed.data);
        return NextResponse.json({ source: "openai", simulation });
      } catch (err) {
        const fallback = mockGenerateSimulation(parsed.data);
        return NextResponse.json({
          source: "demo_ai",
          simulation: fallback,
          warning: err instanceof Error ? err.message : "OpenAI generation failed; used demo AI",
        });
      }
    }

    const simulation = mockGenerateSimulation(parsed.data);
    return NextResponse.json({ source: "demo_ai", simulation });
  } catch {
    return NextResponse.json({ error: "Failed to generate simulation" }, { status: 500 });
  }
}
