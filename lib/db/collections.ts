import type { Db } from "mongodb";

/** Enterprise-style collection map (one document per entity). */
export const COLLECTIONS = {
  organisations: "organisations",
  users: "users",
  departments: "departments",
  competencies: "competencies",
  roles: "roles",
  roleCompetencies: "role_competencies",
  employeeProfiles: "employee_profiles",
  simulations: "simulations",
  assignments: "assignments",
  attempts: "attempts",
  feedbackReports: "feedback_reports",
  improvementPlans: "improvement_plans",
  integrations: "integrations",
  assessments: "assessments",
  assessmentAssignments: "assessment_assignments",
  assessmentSessions: "assessment_sessions",
  assessmentResults: "assessment_results",
  rewindReplays: "rewind_replays",
  workspaceSettings: "workspace_settings",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;

/** Arrays on AppData that map 1:1 to collections (by entity `id`). */
export const ARRAY_ENTITY_KEYS = [
  "users",
  "departments",
  "competencies",
  "roles",
  "roleCompetencies",
  "employeeProfiles",
  "simulations",
  "assignments",
  "attempts",
  "feedbackReports",
  "improvementPlans",
  "integrations",
  "assessments",
  "assessmentAssignments",
  "assessmentSessions",
  "assessmentResults",
  "rewindReplays",
] as const satisfies readonly CollectionKey[];

export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true }),
    db.collection(COLLECTIONS.employeeProfiles).createIndex({ userId: 1 }, { unique: true }),
    db.collection(COLLECTIONS.employeeProfiles).createIndex({ departmentId: 1 }),
    db.collection(COLLECTIONS.roles).createIndex({ departmentId: 1 }),
    db.collection(COLLECTIONS.assessments).createIndex({ status: 1, updatedAt: -1 }),
    db.collection(COLLECTIONS.assessmentAssignments).createIndex({ assessmentId: 1 }),
    db.collection(COLLECTIONS.assessmentAssignments).createIndex({ employeeId: 1 }),
    db.collection(COLLECTIONS.assessmentSessions).createIndex({ assessmentId: 1, employeeId: 1 }),
    db.collection(COLLECTIONS.assessmentResults).createIndex({ assessmentId: 1 }),
    db.collection(COLLECTIONS.assignments).createIndex({ simulationId: 1 }),
    db.collection(COLLECTIONS.attempts).createIndex({ assignmentId: 1, employeeId: 1 }),
  ]);
}
