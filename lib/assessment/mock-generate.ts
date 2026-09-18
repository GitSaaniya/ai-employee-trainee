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
  const role = assessment.roleLabel || "the learner";

  const coreQuestions: AssessmentCoreQuestion[] = [
    {
      id: uid("aq"),
      order: 1,
      text: `Walk me through how you would open a conversation with a busy shopper about ${product} at ${location}.`,
    },
    {
      id: uid("aq"),
      order: 2,
      text: "What discovery questions would you ask to understand the shopper's needs before recommending anything?",
    },
    {
      id: uid("aq"),
      order: 3,
      text: `The shopper says, "I'm in a hurry and already have a brand I like." How do you handle that objection for ${product}?`,
    },
    {
      id: uid("aq"),
      order: 4,
      text: `How would you position the benefits of ${product} in under 30 seconds without sounding scripted?`,
    },
    {
      id: uid("aq"),
      order: 5,
      text: "How do you close the interaction and set a clear next step if they are still undecided?",
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
      descriptors: `Explains ${product} benefits clearly and accurately for ${role}.`,
    },
    {
      id: uid("ars"),
      name: "Closing & next steps",
      weight: 25,
      descriptors: "Seeks commitment or a concrete follow-up without pressure tactics.",
    },
  ];

  const persona = {
    name: assessment.persona.name || "Maya",
    style: assessment.persona.style || "Warm, commercially sharp mall shopper who is time-pressed",
    voiceNotes:
      assessment.persona.voiceNotes ||
      "Conversational English, brief turns, challenges vague pitches, rewards clear benefit language.",
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
      name: "",
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
