import type { Assessment, AssessmentCoreQuestion, AssessmentRubricSkill } from "@/lib/types";
import { uid } from "@/lib/utils";

/** Phase 1 mock generation — replaced by Groq in Phase 3. */
export function mockGenerateAssessmentContent(assessment: Assessment): {
  coreQuestions: AssessmentCoreQuestion[];
  rubricSkills: AssessmentRubricSkill[];
  persona: Assessment["persona"];
} {
  const product = assessment.audienceMetadata.productFocus || "the product";
  const location = assessment.audienceMetadata.locationType || "the floor";
  const role = assessment.roleLabel || "sales associate";

  const coreQuestions: AssessmentCoreQuestion[] = [
    {
      id: uid("aq"),
      order: 1,
      text: `A shopper pauses near ${product} at ${location}. As the ${role}, how would you open the conversation?`,
    },
    {
      id: uid("aq"),
      order: 2,
      text: `Before recommending ${product}, what discovery questions would you ask as the ${role} to understand the shopper's needs?`,
    },
    {
      id: uid("aq"),
      order: 3,
      text: `A shopper says, "I'm in a hurry and already have a brand I like." As the ${role}, how would you handle that for ${product}?`,
    },
    {
      id: uid("aq"),
      order: 4,
      text: `As the ${role}, how would you explain the main benefits of ${product} in under 30 seconds?`,
    },
    {
      id: uid("aq"),
      order: 5,
      text: `If the shopper is still undecided, how would you close or set a clear next step as the ${role}?`,
    },
  ];

  const rubricSkills: AssessmentRubricSkill[] = [
    {
      id: uid("ars"),
      name: "Objection handling",
      weight: 25,
      descriptors: "Acknowledges concerns, reframes value, stays calm under pushback.",
    },
    {
      id: uid("ars"),
      name: "Discovery questioning",
      weight: 25,
      descriptors: "Asks open, relevant questions before pitching; listens actively.",
    },
    {
      id: uid("ars"),
      name: "Product knowledge",
      weight: 25,
      descriptors: `Explains ${product} benefits clearly and accurately as ${role}.`,
    },
    {
      id: uid("ars"),
      name: "Closing & next steps",
      weight: 25,
      descriptors: "Seeks commitment or a concrete follow-up without pressure tactics.",
    },
  ];

  const persona = {
    name: assessment.persona.name || "Ishita",
    gender: assessment.persona.gender ?? "female",
    voiceId: assessment.persona.voiceId || "ishita",
    style:
      assessment.persona.style ||
      "Warm, probing AI interviewer who presents workplace situations and assesses how the employee would handle them",
    voiceNotes:
      assessment.persona.voiceNotes ||
      "Sarvam Bulbul v3 · Ishita. CRITICAL: stay as assessor — never immersive customer chat.",
  };

  return { coreQuestions, rubricSkills, persona };
}

export function createBlankAssessment(organisationId: string, templateId?: string): Assessment {
  const now = new Date().toISOString();
  return {
    id: uid("assess"),
    organisationId,
    title: "",
    status: "draft",
    domain: "",
    roleLabel: "",
    audienceMetadata: {
      region: "",
      level: "",
      productFocus: "",
      locationType: "",
    },
    goal: "",
    learnerPersona: "",
    scenario: "",
    persona: {
      name: "Ishita",
      gender: "female",
      voiceId: "ishita",
      style: "",
      voiceNotes: "",
    },
    durationMinutes: 5,
    coreQuestions: [],
    rubricSkills: [],
    adaptiveEnabled: true,
    templateId,
    authoringStep: "create",
    refineSubStep: 1,
    createdAt: now,
    updatedAt: now,
  };
}
