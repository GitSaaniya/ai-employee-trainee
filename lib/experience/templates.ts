import type { Assessment } from "@/lib/types";
import { resolveAssessorVoice, type AgentGender, voicesForGender } from "@/lib/assessment/voices";

export type ExperienceTemplate = {
  id: string;
  title: string;
  description: string;
  domain: string;
  roleLabel: string;
  goal: string;
  learnerPersona: string;
  scenario: string;
  personaName: string;
  personaStyle: string;
  productFocus: string;
  locationType: string;
  region: string;
  level: string;
  featured?: boolean;
};

/** Phase 0/1 catalogue — FMCG demo is the primary seed. */
export const EXPERIENCE_TEMPLATES: ExperienceTemplate[] = [
  {
    id: "tmpl_mall_shampoo",
    title: "Mall Floor Shampoo Pitch",
    description:
      "Practice selling shampoo to busy mall shoppers — discovery, objection handling, and closing on the floor.",
    domain: "FMCG Sales",
    roleLabel: "Sales Associate",
    goal: "Sell shampoo in malls to walk-in shoppers",
    learnerPersona:
      "Front-line FMCG sales associates who need to open conversations, handle objections, and close without sounding pushy.",
    scenario:
      "A busy weekend afternoon in a mall beauty aisle. Shoppers are time-pressed. The associate must pitch a new shampoo SKU with a clear benefit story.",
    personaName: "Ishita",
    personaStyle:
      "Warm, probing AI interviewer who presents mall-floor situations and assesses how the sales associate would handle them",
    productFocus: "shampoo",
    locationType: "mall floor",
    region: "APAC",
    level: "Associate",
    featured: true,
  },
  {
    id: "tmpl_sales_call",
    title: "Sales Call Simulation",
    description: "Practice handling objections and closing deals with a potential client.",
    domain: "Sales Readiness",
    roleLabel: "Account Executive",
    goal: "Run a structured discovery-to-close sales call",
    learnerPersona: "Account executives who need sharper discovery and objection handling on live calls.",
    scenario: "A prospect joins a 10-minute discovery call with budget pressure and a competing vendor in mind.",
    personaName: "Anand",
    personaStyle:
      "Direct AI interviewer who presents sales-call situations and scores judgment and communication",
    productFocus: "B2B solution",
    locationType: "virtual call",
    region: "Global",
    level: "Mid",
  },
  {
    id: "tmpl_negotiation",
    title: "Negotiation Skills",
    description: "Practice salary or contract negotiation with a tough but fair counterpart.",
    domain: "Managerial Readiness",
    roleLabel: "Team Lead",
    goal: "Negotiate outcomes without damaging the relationship",
    learnerPersona: "Emerging managers negotiating scope, salary, or vendor terms.",
    scenario: "A counterpart pushes hard on price while you protect value and relationship.",
    personaName: "Kabir",
    personaStyle:
      "Neutral AI interviewer who presents negotiation scenarios and assesses approach and composure",
    productFocus: "contract terms",
    locationType: "meeting room",
    region: "Global",
    level: "Lead",
  },
  {
    id: "tmpl_difficult_conversation",
    title: "Difficult Conversation",
    description: "Navigate a sensitive workplace conversation with empathy and clarity.",
    domain: "Managerial Readiness",
    roleLabel: "People Manager",
    goal: "Deliver hard feedback while preserving trust",
    learnerPersona: "People managers who avoid conflict and need structured feedback skills.",
    scenario: "A direct report is underperforming on a visible deliverable and the conversation is overdue.",
    personaName: "Ishita",
    personaStyle:
      "Calm AI interviewer who presents difficult-conversation situations and assesses empathy and clarity",
    productFocus: "performance feedback",
    locationType: "1:1",
    region: "Global",
    level: "Manager",
  },
  {
    id: "tmpl_complaint",
    title: "Customer Complaint Handling",
    description: "De-escalate an upset customer and find a resolution that restores trust.",
    domain: "Frontline Readiness",
    roleLabel: "Customer Service",
    goal: "Resolve complaints with empathy and clear next steps",
    learnerPersona: "Frontline agents handling escalated complaints.",
    scenario: "A customer arrives angry about a failed delivery and wants an immediate fix.",
    personaName: "Rahul",
    personaStyle:
      "Steady AI interviewer who presents complaint scenarios and assesses de-escalation and resolution",
    productFocus: "service recovery",
    locationType: "service desk",
    region: "Global",
    level: "Associate",
  },
  {
    id: "tmpl_interview_practice",
    title: "Interview Practice",
    description: "Simulate a structured behavioral interview with an experienced hiring manager.",
    domain: "Communication Readiness",
    roleLabel: "Candidate",
    goal: "Answer behavioral questions with clear evidence",
    learnerPersona: "Candidates preparing for behavioral interviews.",
    scenario: "A hiring manager runs five structured behavioral questions with follow-ups.",
    personaName: "Priya",
    personaStyle:
      "Structured AI interviewer who asks behavioral questions and probes for clear evidence",
    productFocus: "career narrative",
    locationType: "interview",
    region: "Global",
    level: "All",
  },
];

export function applyTemplateToAssessment(
  assessment: Assessment,
  template: ExperienceTemplate,
  roleId?: string
): Assessment {
  const gender: AgentGender = /anand|aditya|kabir|rahul/i.test(template.personaName)
    ? "male"
    : "female";
  const matchedVoice = voicesForGender(gender).find(
    (v) => v.suggestedName.toLowerCase() === template.personaName.trim().toLowerCase()
  );
  const voice = resolveAssessorVoice({
    gender,
    voiceId: matchedVoice?.id ?? (gender === "male" ? "anand" : "ishita"),
  });
  // Prefer template name when it matches a curated voice; else suggested name
  const name = template.personaName.trim() || voice.suggestedName;

  return {
    ...assessment,
    title: template.title,
    domain: template.domain,
    roleId,
    roleLabel: template.roleLabel,
    goal: template.goal,
    learnerPersona: template.learnerPersona,
    scenario: template.scenario,
    templateId: template.id,
    audienceMetadata: {
      region: template.region,
      level: template.level,
      productFocus: template.productFocus,
      locationType: template.locationType,
    },
    persona: {
      name,
      gender,
      voiceId: voice.id,
      style: template.personaStyle,
      voiceNotes: `${voice.label}. CRITICAL: assess situational judgment — never immersive customer roleplay.`,
    },
  };
}
