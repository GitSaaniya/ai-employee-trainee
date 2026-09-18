import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "employee"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "overdue"
  | "reassigned";

export type PerformanceBand =
  | "ready"
  | "nearly_ready"
  | "development_needed"
  | "high_support_required";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type SimulationStatus = "draft" | "published" | "archived";
export type IntegrationStatus = "available" | "connected" | "coming_soon";
export type ImprovementActionStatus = "pending" | "in_progress" | "completed" | "deferred";

export type AssessmentStatus = "draft" | "generating" | "ready" | "published" | "archived";
export type AssessmentAssignmentStatus = "assigned" | "in_progress" | "completed" | "expired";
export type AssessmentAuthoringStep = "create" | "refine" | "generate" | "deploy";
export type AssessmentRefineSubStep = 1 | 2 | 3;

export interface AssessmentRubricSkill {
  id: string;
  name: string;
  weight: number;
  descriptors: string;
}

export interface AssessmentCoreQuestion {
  id: string;
  order: number;
  text: string;
}

export interface AssessmentPersona {
  name: string;
  style: string;
  voiceNotes: string;
}

export interface AssessmentAudienceMetadata {
  region: string;
  level: string;
  productFocus: string;
  locationType: string;
}

export interface Assessment {
  id: string;
  organisationId: string;
  title: string;
  status: AssessmentStatus;
  domain: string;
  roleId?: string;
  roleLabel: string;
  audienceMetadata: AssessmentAudienceMetadata;
  goal: string;
  learnerPersona: string;
  scenario: string;
  persona: AssessmentPersona;
  durationMinutes: number;
  coreQuestions: AssessmentCoreQuestion[];
  rubricSkills: AssessmentRubricSkill[];
  adaptiveEnabled: boolean;
  templateId?: string;
  authoringStep: AssessmentAuthoringStep;
  refineSubStep: AssessmentRefineSubStep;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAssignment {
  id: string;
  organisationId: string;
  assessmentId: string;
  employeeId: string;
  status: AssessmentAssignmentStatus;
  dueAt: string;
  assignedAt: string;
  completedAt?: string;
}

export type AssessmentTurnRole = "ai" | "user" | "system";

export interface AssessmentTurn {
  id: string;
  role: AssessmentTurnRole;
  text: string;
  at: string;
  followUp?: boolean;
}

export interface AssessmentSession {
  id: string;
  organisationId: string;
  assignmentId: string;
  assessmentId: string;
  employeeId: string;
  startedAt: string;
  endedAt?: string;
  permissionGranted: { camera: boolean; microphone: boolean };
  turns: AssessmentTurn[];
  status: "active" | "completed" | "aborted";
  currentQuestionIndex: number;
  adaptiveFollowUpsUsed: number;
}

export interface AssessmentSkillScore {
  skillId: string;
  name: string;
  score: number;
  evidence: string[];
}

export interface AssessmentResult {
  id: string;
  sessionId: string;
  assignmentId: string;
  employeeId: string;
  assessmentId: string;
  overallScore: number;
  skillScores: AssessmentSkillScore[];
  employeeSummary: string;
  adminReport: string;
  scoredAt: string;
  scoredBy: "demo" | "groq";
}

export type InterviewUiState =
  | "idle"
  | "requesting_permissions"
  | "ready"
  | "speaking"
  | "listening"
  | "turn_pending"
  | "transcribing"
  | "thinking"
  | "interrupted"
  | "complete"
  | "error";
export interface Organisation {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organisationId: string;
  email: string;
  name: string;
  role: UserRole;
  avatarInitials: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  organisationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Competency {
  id: string;
  organisationId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleCompetency {
  id: string;
  roleId: string;
  competencyId: string;
  weight: number;
  expectedProficiency: number;
  observableBehaviours: string[];
  commonMistakes: string[];
  businessOutcomes: string[];
}

export interface Role {
  id: string;
  organisationId: string;
  name: string;
  departmentId: string;
  description: string;
  seniorityLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeProfile {
  id: string;
  userId: string;
  organisationId: string;
  roleId: string;
  departmentId: string;
  managerId?: string;
  readinessScore: number;
  previousScore: number;
  riskLevel: RiskLevel;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseOption {
  id: string;
  stageId: string;
  label: string;
  text: string;
  score: number;
  isBest: boolean;
  isCriticalFailure: boolean;
  competencyImpacts: Record<string, number>;
  feedback: string;
  consequence: string;
  nextStageModifier?: string;
}

export interface SimulationStage {
  id: string;
  simulationId: string;
  order: number;
  title: string;
  situation: string;
  characterName: string;
  characterRole: string;
  characterMessage: string;
  decisionPrompt: string;
  policyReference?: string;
  options: ResponseOption[];
}

export interface Simulation {
  id: string;
  organisationId: string;
  title: string;
  businessProblem: string;
  targetRoleId: string;
  learningObjective: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedDurationMinutes: number;
  scenarioContext: string;
  characters: string[];
  employeeResponsibility: string;
  constraints: string[];
  policies: string[];
  assessedCompetencyIds: string[];
  competencyWeights: Record<string, number>;
  passingScore: number;
  criticalFailureBehaviours: string[];
  performanceBands: {
    ready: [number, number];
    nearlyReady: [number, number];
    developmentNeeded: [number, number];
    highSupport: [number, number];
  };
  status: SimulationStatus;
  stages: SimulationStage[];
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  organisationId: string;
  simulationId: string;
  title: string;
  assigneeType: "individual" | "team" | "department" | "role";
  assigneeIds: string[];
  employeeIds: string[];
  dueDate: string;
  passingScore: number;
  allowMultipleAttempts: boolean;
  maxAttempts?: number;
  instructions: string;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StageResponse {
  id: string;
  attemptId: string;
  stageId: string;
  optionId: string;
  score: number;
  competencyImpacts: Record<string, number>;
  isCriticalFailure: boolean;
  submittedAt: string;
}

export interface CompetencyScore {
  competencyId: string;
  score: number;
  required: number;
  gap: number;
  weight: number;
}

export interface SimulationAttempt {
  id: string;
  organisationId: string;
  assignmentId: string;
  simulationId: string;
  employeeId: string;
  attemptNumber: number;
  status: "in_progress" | "completed" | "abandoned";
  currentStageIndex: number;
  overallScore?: number;
  performanceBand?: PerformanceBand;
  competencyScores: CompetencyScore[];
  stageResponses: StageResponse[];
  hasCriticalFailure: boolean;
  timeSpentMinutes: number;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackReport {
  id: string;
  attemptId: string;
  employeeId: string;
  organisationId: string;
  overallScore: number;
  performanceBand: PerformanceBand;
  strengths: string[];
  developmentAreas: string[];
  strongDecisions: string[];
  missedOpportunities: string[];
  criticalErrors: string[];
  specificFeedback: string[];
  recommendedNextPractice: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImprovementAction {
  id: string;
  planId: string;
  skillToImprove: string;
  evidence: string;
  recommendedAction: string;
  practiceActivity: string;
  successMeasure: string;
  reviewDate: string;
  status: ImprovementActionStatus;
  aiGenerated: boolean;
}

export interface ImprovementPlan {
  id: string;
  organisationId: string;
  employeeId: string;
  attemptId: string;
  title: string;
  summary: string;
  actions: ImprovementAction[];
  status: "draft" | "pending_review" | "approved" | "active" | "completed";
  aiGenerated: boolean;
  reviewedByAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  id: string;
  name: string;
  category: "hris" | "lms" | "identity" | "collaboration" | "analytics";
  status: IntegrationStatus;
  description: string;
}

export interface AppSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  organisationId: string;
}

export interface AppData {
  organisation: Organisation;
  users: User[];
  departments: Department[];
  competencies: Competency[];
  roles: Role[];
  roleCompetencies: RoleCompetency[];
  employeeProfiles: EmployeeProfile[];
  simulations: Simulation[];
  assignments: Assignment[];
  attempts: SimulationAttempt[];
  feedbackReports: FeedbackReport[];
  improvementPlans: ImprovementPlan[];
  integrations: Integration[];
  assessments: Assessment[];
  assessmentAssignments: AssessmentAssignment[];
  assessmentSessions: AssessmentSession[];
  assessmentResults: AssessmentResult[];
  /** Rewind & Replay alternate choices after a completed simulation */
  rewindReplays: RewindReplay[];
  demoMode: boolean;
}

/** A pivotal stage where the learner’s choice hurt the outcome. */
export interface RewindCriticalMoment {
  stageId: string;
  stageOrder: number;
  stageTitle: string;
  characterName: string;
  characterRole: string;
  characterMessage: string;
  decisionPrompt: string;
  originalOptionId: string;
  originalLabel: string;
  originalText: string;
  originalConsequence: string;
  originalScore: number;
  bestOptionId: string;
  bestOptionText: string;
  /** Short coach tip, e.g. “You explained policy immediately… try acknowledging first.” */
  impactSummary: string;
  affectedCompetencyIds: string[];
  severity: "critical" | "high" | "medium";
}

export interface RewindReplay {
  id: string;
  organisationId: string;
  attemptId: string;
  assignmentId: string;
  simulationId: string;
  employeeId: string;
  stageId: string;
  originalOptionId: string;
  revisedOptionId: string;
  originalConsequence: string;
  revisedConsequence: string;
  originalOverallScore: number;
  revisedOverallScore: number;
  originalCompetencyScores: CompetencyScore[];
  revisedCompetencyScores: CompetencyScore[];
  createdAt: string;
}

export const GenerateSimulationInputSchema = z.object({
  title: z.string().min(3),
  businessProblem: z.string().min(10),
  targetRoleId: z.string(),
  learningObjective: z.string().min(10),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  competencyIds: z.array(z.string()).min(1),
});

export type GenerateSimulationInput = z.infer<typeof GenerateSimulationInputSchema>;

export const RoleFormSchema = z.object({
  name: z.string().min(2, "Role name is required"),
  departmentId: z.string().min(1, "Department is required"),
  description: z.string().min(10, "Description is required"),
  seniorityLevel: z.string().min(1, "Seniority level is required"),
  competencies: z
    .array(
      z.object({
        competencyId: z.string(),
        weight: z.number().min(1).max(100),
        expectedProficiency: z.number().min(0).max(100),
        observableBehaviours: z.string(),
        commonMistakes: z.string(),
        businessOutcomes: z.string(),
      })
    )
    .min(1),
});

export type RoleFormValues = z.infer<typeof RoleFormSchema>;
