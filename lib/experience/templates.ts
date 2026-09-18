import type { Assessment } from "@/lib/types";

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
    personaName: "Maya",
    personaStyle: "Warm but skeptical mall shopper who has limited time",
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
    personaName: "Alex",
    personaStyle: "Busy procurement-minded buyer",
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
    personaName: "Sam",
    personaStyle: "Tough but fair negotiator",
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
    personaName: "Jordan",
    personaStyle: "Defensive but coachable report",
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
    personaName: "Riley",
    personaStyle: "Upset customer seeking accountability",
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
    personaStyle: "Experienced hiring manager",
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
      name: template.personaName,
      style: template.personaStyle,
      voiceNotes: "Conversational English, short turns, challenges vague answers.",
    },
  };
}
