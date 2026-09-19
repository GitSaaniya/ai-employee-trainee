export type AgentGender = "female" | "male";

export type AssessorVoiceOption = {
  id: string;
  label: string;
  gender: AgentGender;
  /** Suggested display name when this voice is selected */
  suggestedName: string;
  blurb: string;
  /** Sarvam delivery tuned for natural spoken conversation */
  delivery: { pace: number; temperature: number };
};

/**
 * Curated Sarvam Bulbul v3 speakers for professional English assessment.
 * Prefer conversational / natural voices over dramatic defaults.
 */
export const ASSESSOR_VOICES: AssessorVoiceOption[] = [
  {
    id: "ishita",
    label: "Ishita",
    gender: "female",
    suggestedName: "Ishita",
    blurb: "Natural conversational — best default for female assessors",
    delivery: { pace: 0.98, temperature: 0.78 },
  },
  {
    id: "shreya",
    label: "Shreya",
    gender: "female",
    suggestedName: "Shreya",
    blurb: "Clear and warm professional English",
    delivery: { pace: 0.97, temperature: 0.75 },
  },
  {
    id: "priya",
    label: "Priya",
    gender: "female",
    suggestedName: "Priya",
    blurb: "Steady interviewer presence",
    delivery: { pace: 0.96, temperature: 0.72 },
  },
  {
    id: "simran",
    label: "Simran",
    gender: "female",
    suggestedName: "Simran",
    blurb: "Crisp and confident",
    delivery: { pace: 1.0, temperature: 0.74 },
  },
  {
    id: "rahul",
    label: "Rahul",
    gender: "male",
    suggestedName: "Rahul",
    blurb: "Natural conversational — best default for male assessors",
    delivery: { pace: 0.97, temperature: 0.76 },
  },
  {
    id: "anand",
    label: "Anand",
    gender: "male",
    suggestedName: "Anand",
    blurb: "Calm professional interviewer",
    delivery: { pace: 0.95, temperature: 0.7 },
  },
  {
    id: "aditya",
    label: "Aditya",
    gender: "male",
    suggestedName: "Aditya",
    blurb: "Clear and confident",
    delivery: { pace: 0.98, temperature: 0.72 },
  },
  {
    id: "kabir",
    label: "Kabir",
    gender: "male",
    suggestedName: "Kabir",
    blurb: "Warm and measured",
    delivery: { pace: 0.94, temperature: 0.74 },
  },
];

export const DEFAULT_VOICE_BY_GENDER: Record<AgentGender, string> = {
  female: "ishita",
  male: "rahul",
};

export const DEFAULT_NAME_BY_GENDER: Record<AgentGender, string> = {
  female: "Ishita",
  male: "Rahul",
};

export function voicesForGender(gender: AgentGender): AssessorVoiceOption[] {
  return ASSESSOR_VOICES.filter((v) => v.gender === gender);
}

export function resolveAssessorVoice(params: {
  gender?: AgentGender | string | null;
  voiceId?: string | null;
  nameHint?: string | null;
}): AssessorVoiceOption {
  const wanted = (params.voiceId || "").trim().toLowerCase();
  const nameHint = (params.nameHint || "").trim().toLowerCase();

  // Prefer explicit speaker id even if gender field is stale/wrong
  if (wanted) {
    const byId = ASSESSOR_VOICES.find((v) => v.id === wanted);
    if (byId) return byId;
  }

  // Match curated voice by persona display name (Ishita, Anand, …)
  if (nameHint) {
    const byName = ASSESSOR_VOICES.find(
      (v) =>
        v.id === nameHint ||
        v.suggestedName.toLowerCase() === nameHint ||
        v.label.toLowerCase() === nameHint
    );
    if (byName) return byName;
  }

  const gender: AgentGender = params.gender === "male" ? "male" : "female";
  const fallbackId = DEFAULT_VOICE_BY_GENDER[gender];
  return ASSESSOR_VOICES.find((v) => v.id === fallbackId) ?? ASSESSOR_VOICES[0]!;
}

export function applyGenderToPersona(
  gender: AgentGender,
  current: { name: string; style: string; voiceNotes: string; gender?: AgentGender; voiceId?: string }
) {
  const voice = resolveAssessorVoice({ gender, voiceId: DEFAULT_VOICE_BY_GENDER[gender] });
  return {
    ...current,
    gender,
    voiceId: voice.id,
    name: voice.suggestedName,
    style:
      current.style?.trim() ||
      `Professional ${gender} AI interviewer who presents workplace situations and assesses judgment without coaching`,
    voiceNotes: `Sarvam Bulbul v3 · ${voice.label}. CRITICAL: assess only — never immersive roleplay.`,
  };
}
