import type {
  AppData,
  AppSession,
  Assessment,
  AssessmentAssignment,
  AssessmentResult,
  AssessmentSession,
  AssessmentTurn,
  Assignment,
  EmployeeProfile,
  ImprovementPlan,
  RewindReplay,
  Role,
  RoleCompetency,
  Simulation,
  SimulationAttempt,
  StageResponse,
  User,
} from "@/lib/types";
import { createSeedData } from "@/lib/data/seed";
import { mockGenerateAssessmentContent } from "@/lib/assessment/mock-generate";
import { buildMockAssessmentResult } from "@/lib/assessment/mock-engine";
import { buildFeedbackReport, buildImprovementPlan } from "@/lib/improvement";
import { scoreWithRevisedChoice } from "@/lib/rewind/critical-moments";
import { detectConsecutiveNonImproving, riskFromReadiness, scoreAttempt } from "@/lib/scoring";
import { uid } from "@/lib/utils";

const STORAGE_KEY = "skillsim_app_data_v3";
const SESSION_KEY = "skillsim_session_v1";

let memory: AppData | null = null;
let hydratePromise: Promise<void> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let mongoEnabled = true;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function migrateAppData(raw: AppData): AppData {
  const seed = createSeedData();
  const data = raw as AppData & {
    assessments?: Assessment[];
    assessmentAssignments?: AssessmentAssignment[];
    assessmentSessions?: AssessmentSession[];
    assessmentResults?: AssessmentResult[];
  };

  if (!Array.isArray(data.assessments)) data.assessments = seed.assessments;
  if (!Array.isArray(data.assessmentAssignments)) data.assessmentAssignments = seed.assessmentAssignments;
  if (!Array.isArray(data.assessmentSessions)) data.assessmentSessions = [];
  if (!Array.isArray(data.assessmentResults)) data.assessmentResults = [];
  if (!Array.isArray((data as AppData).rewindReplays)) {
    (data as AppData).rewindReplays = seed.rewindReplays ?? [];
  }

  // Keep demo Jordan attempt responses in sync for Rewind & Replay
  const jordan = data.attempts.find((a) => a.id === "att_jordan_1");
  const jordanSeed = seed.attempts.find((a) => a.id === "att_jordan_1");
  if (jordan && jordanSeed && jordanSeed.stageResponses.length > 0) {
    jordan.stageResponses = clone(jordanSeed.stageResponses);
    jordan.hasCriticalFailure = jordanSeed.hasCriticalFailure;
  }

  if (!data.departments.some((d) => d.id === "dept_fmcg")) {
    const dept = seed.departments.find((d) => d.id === "dept_fmcg");
    if (dept) data.departments.push(dept);
  }
  if (!data.roles.some((r) => r.id === "role_fmcg_sales")) {
    const role = seed.roles.find((r) => r.id === "role_fmcg_sales");
    if (role) data.roles.push(role);
  }
  if (!data.assessments.some((a) => a.id === "assess_mall_shampoo")) {
    const assessment = seed.assessments.find((a) => a.id === "assess_mall_shampoo");
    if (assessment) data.assessments.push(assessment);
  }
  for (const asg of seed.assessmentAssignments) {
    if (!data.assessmentAssignments.some((a) => a.id === asg.id)) {
      data.assessmentAssignments.push(asg);
    }
  }

  // Keep demo learner identity in sync (Manu Nair / knolskape)
  const demoEmployee = seed.users.find((u) => u.id === "user_emp_demo");
  if (demoEmployee) {
    const existingDemo = data.users.find((u) => u.id === "user_emp_demo");
    const legacyEmails = new Set([
      "employee@skillsim.ai",
      "manu.nair@knolskape.com",
      demoEmployee.email.toLowerCase(),
    ]);
    if (existingDemo) {
      existingDemo.email = demoEmployee.email;
      existingDemo.name = demoEmployee.name;
      existingDemo.avatarInitials = demoEmployee.avatarInitials;
      existingDemo.updatedAt = demoEmployee.updatedAt;
    } else if (!data.users.some((u) => legacyEmails.has(u.email.toLowerCase()))) {
      data.users.push(clone(demoEmployee));
    } else {
      const legacy = data.users.find((u) => legacyEmails.has(u.email.toLowerCase()));
      if (legacy) {
        legacy.email = demoEmployee.email;
        legacy.name = demoEmployee.name;
        legacy.avatarInitials = demoEmployee.avatarInitials;
        legacy.role = "employee";
        legacy.updatedAt = demoEmployee.updatedAt;
      }
    }
    if (!data.employeeProfiles.some((p) => p.userId === "user_emp_demo" || p.id === "ep_demo")) {
      const profile = seed.employeeProfiles.find((p) => p.id === "ep_demo");
      if (profile) data.employeeProfiles.push(clone(profile));
    }
  }

  // Drop empty untitled drafts left behind by opening "New assessment"
  const emptyDraftIds = new Set(
    data.assessments
      .filter(
        (a) =>
          a.status === "draft" &&
          !a.title.trim() &&
          !a.domain.trim() &&
          !a.roleLabel.trim() &&
          a.coreQuestions.length === 0
      )
      .map((a) => a.id)
  );
  if (emptyDraftIds.size > 0) {
    data.assessments = data.assessments.filter((a) => !emptyDraftIds.has(a.id));
    data.assessmentAssignments = data.assessmentAssignments.filter(
      (a) => !emptyDraftIds.has(a.assessmentId)
    );
    data.assessmentSessions = data.assessmentSessions.filter(
      (s) => !emptyDraftIds.has(s.assessmentId)
    );
    data.assessmentResults = data.assessmentResults.filter(
      (r) => !emptyDraftIds.has(r.assessmentId)
    );
  }

  return data;
}

export function getData(): AppData {
  if (memory) return clone(memory);

  if (typeof window !== "undefined") {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("skillsim_app_data_v2") ??
      localStorage.getItem("skillsim_app_data_v1");
    if (raw) {
      try {
        memory = migrateAppData(JSON.parse(raw) as AppData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
        return clone(memory);
      } catch {
        // fall through to seed
      }
    }
  }
  if (!memory) memory = createSeedData();
  return clone(memory);
}

function persistToLocal(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function scheduleMongoPersist(data: AppData) {
  if (typeof window === "undefined" || !mongoEnabled) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void fetch("/api/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    }).catch(() => {
      // Keep local cache if remote save fails.
    });
  }, 350);
}

export function setData(data: AppData) {
  memory = clone(data);
  persistToLocal(memory);
  scheduleMongoPersist(memory);
}

/** Load AppData from MongoDB (via /api/data). Falls back to local/seed if unavailable. */
export async function hydrateFromServer(force = false): Promise<AppData> {
  if (typeof window === "undefined") {
    return getData();
  }
  if (force) {
    hydratePromise = null;
  }
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        if (res.status === 503) {
          mongoEnabled = false;
          getData();
          return;
        }
        if (!res.ok) {
          getData();
          return;
        }
        const payload = (await res.json()) as { data?: AppData; configured?: boolean };
        if (!payload.data) {
          getData();
          return;
        }
        mongoEnabled = true;
        memory = migrateAppData(payload.data);
        // Cache locally only — do not PUT back (avoids overwriting Mongo with stale client state).
        persistToLocal(memory);
      } catch {
        mongoEnabled = false;
        getData();
      }
    })();
  }
  await hydratePromise;
  return getData();
}

export function resetData() {
  memory = createSeedData();
  persistToLocal(memory);
  scheduleMongoPersist(memory);
  return clone(memory);
}

export function getSession(): AppSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppSession;
  } catch {
    return null;
  }
}

export function setSession(session: AppSession | null) {
  if (typeof window === "undefined") return;
  if (!session) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loginAs(email: string): AppSession | null {
  const data = getData();
  const normalized = email.trim().toLowerCase();
  const user = data.users.find((u) => u.email.toLowerCase() === normalized);
  if (!user) return null;
  const session: AppSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organisationId: user.organisationId,
  };
  setSession(session);
  return session;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

/** Admin adds a learner who can then sign in with that email + EMPLOYEE_PASSWORD. */
export function createEmployee(input: {
  name: string;
  email: string;
  department: string;
}): { user: User; profile: EmployeeProfile } {
  const data = getData();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const departmentName = input.department.trim();
  if (!name || !email || !departmentName) {
    throw new Error("Name, email, and department are required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address");
  }
  if (data.users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("An account with this email already exists");
  }

  const now = new Date().toISOString();
  const orgId = data.organisation.id;

  let department = data.departments.find(
    (d) => d.name.toLowerCase() === departmentName.toLowerCase()
  );
  if (!department) {
    department = {
      id: uid("dept"),
      organisationId: orgId,
      name: departmentName,
      createdAt: now,
      updatedAt: now,
    };
    data.departments.push(department);
  }

  let role = data.roles.find((r) => r.departmentId === department!.id);
  if (!role) {
    role = {
      id: uid("role"),
      organisationId: orgId,
      name: departmentName,
      departmentId: department.id,
      description: `${departmentName} team member`,
      seniorityLevel: "Associate",
      createdAt: now,
      updatedAt: now,
    };
    data.roles.push(role);
  }

  const user: User = {
    id: uid("user"),
    organisationId: orgId,
    email,
    name,
    role: "employee",
    avatarInitials: initialsFromName(name),
    createdAt: now,
    updatedAt: now,
  };

  const profile: EmployeeProfile = {
    id: uid("ep"),
    userId: user.id,
    organisationId: orgId,
    roleId: role.id,
    departmentId: department.id,
    readinessScore: 0,
    previousScore: 0,
    riskLevel: "medium",
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  };

  data.users.push(user);
  data.employeeProfiles.push(profile);
  setData(data);
  return { user, profile };
}

export function logout() {
  setSession(null);
}

export function competencyNameMap(data: AppData): Record<string, string> {
  return Object.fromEntries(data.competencies.map((c) => [c.id, c.name]));
}

export function getEmployeeProfileIdForUser(userId: string): string | undefined {
  return getData().employeeProfiles.find((e) => e.userId === userId)?.id;
}

export function upsertRole(
  role: Omit<Role, "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string },
  competencies: Omit<RoleCompetency, "id" | "roleId">[]
) {
  const data = getData();
  const now = new Date().toISOString();
  const existingIdx = data.roles.findIndex((r) => r.id === role.id);
  const saved: Role = {
    ...role,
    createdAt: role.createdAt ?? now,
    updatedAt: now,
  };
  if (existingIdx >= 0) data.roles[existingIdx] = saved;
  else data.roles.push(saved);

  data.roleCompetencies = data.roleCompetencies.filter((rc) => rc.roleId !== saved.id);
  for (const rc of competencies) {
    data.roleCompetencies.push({
      id: uid("rc"),
      roleId: saved.id,
      ...rc,
    });
  }
  setData(data);
  return saved;
}

export function saveSimulation(sim: Simulation) {
  const data = getData();
  const idx = data.simulations.findIndex((s) => s.id === sim.id);
  const saved = { ...sim, updatedAt: new Date().toISOString() };
  if (idx >= 0) data.simulations[idx] = saved;
  else data.simulations.push({ ...saved, createdAt: saved.createdAt || new Date().toISOString() });
  setData(data);
  return saved;
}

export function createAssignment(input: Omit<Assignment, "id" | "createdAt" | "updatedAt" | "status"> & { status?: Assignment["status"] }) {
  const data = getData();
  const now = new Date().toISOString();
  const assignment: Assignment = {
    ...input,
    id: uid("asg"),
    status: input.status ?? "not_started",
    createdAt: now,
    updatedAt: now,
  };
  data.assignments.push(assignment);
  setData(data);
  return assignment;
}

export function startOrResumeAttempt(assignmentId: string, employeeId: string): SimulationAttempt {
  const data = getData();
  const assignment = data.assignments.find((a) => a.id === assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  const existing = data.attempts.find(
    (a) => a.assignmentId === assignmentId && a.employeeId === employeeId && a.status === "in_progress"
  );
  if (existing) return existing;

  const prior = data.attempts.filter((a) => a.assignmentId === assignmentId && a.employeeId === employeeId);
  const now = new Date().toISOString();
  const attempt: SimulationAttempt = {
    id: uid("att"),
    organisationId: assignment.organisationId,
    assignmentId,
    simulationId: assignment.simulationId,
    employeeId,
    attemptNumber: prior.length + 1,
    status: "in_progress",
    currentStageIndex: 0,
    competencyScores: [],
    stageResponses: [],
    hasCriticalFailure: false,
    timeSpentMinutes: 0,
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  data.attempts.push(attempt);
  assignment.status = "in_progress";
  assignment.updatedAt = now;
  setData(data);
  return attempt;
}

export function submitStageResponse(params: {
  attemptId: string;
  stageId: string;
  optionId: string;
}): { attempt: SimulationAttempt; consequence: string; completed: boolean } {
  const data = getData();
  const attempt = data.attempts.find((a) => a.id === params.attemptId);
  if (!attempt) throw new Error("Attempt not found");
  const simulation = data.simulations.find((s) => s.id === attempt.simulationId);
  if (!simulation) throw new Error("Simulation not found");
  const stage = simulation.stages.find((s) => s.id === params.stageId);
  const option = stage?.options.find((o) => o.id === params.optionId);
  if (!stage || !option) throw new Error("Option not found");

  const response: StageResponse = {
    id: uid("resp"),
    attemptId: attempt.id,
    stageId: stage.id,
    optionId: option.id,
    score: option.score,
    competencyImpacts: option.competencyImpacts,
    isCriticalFailure: option.isCriticalFailure,
    submittedAt: new Date().toISOString(),
  };
  attempt.stageResponses.push(response);
  if (option.isCriticalFailure) attempt.hasCriticalFailure = true;

  const nextIndex = attempt.currentStageIndex + 1;
  const completed = nextIndex >= simulation.stages.length;
  attempt.currentStageIndex = Math.min(nextIndex, simulation.stages.length);
  attempt.updatedAt = new Date().toISOString();
  attempt.timeSpentMinutes += 3;

  if (completed) {
    finalizeAttempt(data, attempt, simulation);
  }

  setData(data);
  return { attempt: clone(attempt), consequence: option.consequence, completed };
}

function finalizeAttempt(data: AppData, attempt: SimulationAttempt, simulation: Simulation) {
  const selectedOptions = attempt.stageResponses
    .map((r) => {
      const stage = simulation.stages.find((s) => s.id === r.stageId);
      return stage?.options.find((o) => o.id === r.optionId);
    })
    .filter((o): o is NonNullable<typeof o> => Boolean(o));

  const scored = scoreAttempt(simulation, selectedOptions);
  attempt.status = "completed";
  attempt.completedAt = new Date().toISOString();
  attempt.overallScore = scored.overallScore;
  attempt.performanceBand = scored.performanceBand;
  attempt.competencyScores = scored.competencyScores;
  attempt.hasCriticalFailure = scored.hasCriticalFailure;

  const names = competencyNameMap(data);
  const feedback = buildFeedbackReport({
    attempt,
    simulation,
    selectedOptions,
    competencyNames: names,
  });
  data.feedbackReports.push(feedback);

  const plan = buildImprovementPlan({
    attempt,
    feedback,
    competencyNames: names,
    simulationTitle: simulation.title,
  });
  data.improvementPlans.push(plan);

  const profile = data.employeeProfiles.find((e) => e.id === attempt.employeeId);
  if (profile) {
    profile.previousScore = profile.readinessScore;
    profile.readinessScore = scored.overallScore;
    const employeeAttempts = data.attempts.filter((a) => a.employeeId === profile.id);
    profile.riskLevel = riskFromReadiness(
      scored.overallScore,
      scored.hasCriticalFailure || detectConsecutiveNonImproving(employeeAttempts)
    );
    profile.lastActivityAt = attempt.completedAt!;
    profile.updatedAt = attempt.completedAt!;
  }

  const assignment = data.assignments.find((a) => a.id === attempt.assignmentId);
  if (assignment) {
    const employeeAttempts = data.attempts.filter(
      (a) => a.assignmentId === assignment.id && a.employeeId === attempt.employeeId && a.status === "completed"
    );
    if (employeeAttempts.length > 0) {
      // mark completed for this learner; assignment may still be in progress overall
      const allDone = assignment.employeeIds.every((eid) =>
        data.attempts.some((a) => a.assignmentId === assignment.id && a.employeeId === eid && a.status === "completed")
      );
      assignment.status = allDone ? "completed" : "in_progress";
      assignment.updatedAt = attempt.completedAt!;
    }
  }
}

export function approveImprovementPlan(planId: string) {
  const data = getData();
  const plan = data.improvementPlans.find((p) => p.id === planId);
  if (!plan) throw new Error("Plan not found");
  plan.status = "active";
  plan.reviewedByAdmin = true;
  plan.updatedAt = new Date().toISOString();
  setData(data);
  return plan;
}

export function updateImprovementPlan(plan: ImprovementPlan) {
  const data = getData();
  const idx = data.improvementPlans.findIndex((p) => p.id === plan.id);
  if (idx < 0) throw new Error("Plan not found");
  data.improvementPlans[idx] = { ...plan, updatedAt: new Date().toISOString() };
  setData(data);
  return data.improvementPlans[idx];
}

export function setDemoMode(enabled: boolean) {
  const data = getData();
  data.demoMode = enabled;
  setData(data);
  return data.demoMode;
}

export function assignTargetedPractice(employeeId: string, simulationId: string) {
  const data = getData();
  const simulation = data.simulations.find((s) => s.id === simulationId);
  if (!simulation) throw new Error("Simulation not found");
  const now = new Date().toISOString();
  const due = new Date();
  due.setDate(due.getDate() + 7);
  const assignment: Assignment = {
    id: uid("asg"),
    organisationId: data.organisation.id,
    simulationId,
    title: `Targeted practice — ${simulation.title}`,
    assigneeType: "individual",
    assigneeIds: [employeeId],
    employeeIds: [employeeId],
    dueDate: due.toISOString(),
    passingScore: simulation.passingScore,
    allowMultipleAttempts: true,
    maxAttempts: 5,
    instructions: "Assigned as targeted practice from an employee performance review.",
    status: "not_started",
    createdAt: now,
    updatedAt: now,
  };
  data.assignments.push(assignment);
  setData(data);
  return assignment;
}

export function saveAssessment(assessment: Assessment) {
  const data = getData();
  const idx = data.assessments.findIndex((a) => a.id === assessment.id);
  const saved: Assessment = { ...assessment, updatedAt: new Date().toISOString() };
  if (idx >= 0) data.assessments[idx] = saved;
  else data.assessments.push({ ...saved, createdAt: saved.createdAt || new Date().toISOString() });
  setData(data);
  return saved;
}

export function getAssessment(id: string): Assessment | undefined {
  return getData().assessments.find((a) => a.id === id);
}

export function generateAssessmentContent(assessmentId: string): Assessment {
  const data = getData();
  const idx = data.assessments.findIndex((a) => a.id === assessmentId);
  if (idx < 0) throw new Error("Assessment not found");
  const current = data.assessments[idx];
  const generated = mockGenerateAssessmentContent(current);
  const saved: Assessment = {
    ...current,
    ...generated,
    status: "ready",
    authoringStep: "generate",
    updatedAt: new Date().toISOString(),
  };
  data.assessments[idx] = saved;
  setData(data);
  return saved;
}

export function publishAssessment(assessmentId: string): Assessment {
  const data = getData();
  const idx = data.assessments.findIndex((a) => a.id === assessmentId);
  if (idx < 0) throw new Error("Assessment not found");
  const saved: Assessment = {
    ...data.assessments[idx],
    status: "published",
    authoringStep: "deploy",
    updatedAt: new Date().toISOString(),
  };
  data.assessments[idx] = saved;
  setData(data);
  return saved;
}

export function assignAssessmentToEmployees(
  assessmentId: string,
  employeeIds: string[],
  dueAt: string
): AssessmentAssignment[] {
  const data = getData();
  const assessment = data.assessments.find((a) => a.id === assessmentId);
  if (!assessment) throw new Error("Assessment not found");
  const now = new Date().toISOString();
  const created: AssessmentAssignment[] = [];

  for (const employeeId of employeeIds) {
    const existing = data.assessmentAssignments.find(
      (a) =>
        a.assessmentId === assessmentId &&
        a.employeeId === employeeId &&
        (a.status === "assigned" || a.status === "in_progress")
    );
    if (existing) continue;
    const assignment: AssessmentAssignment = {
      id: uid("aasg"),
      organisationId: assessment.organisationId,
      assessmentId,
      employeeId,
      status: "assigned",
      dueAt,
      assignedAt: now,
    };
    data.assessmentAssignments.push(assignment);
    created.push(assignment);
  }

  if (assessment.status !== "published") {
    const idx = data.assessments.findIndex((a) => a.id === assessmentId);
    data.assessments[idx] = {
      ...assessment,
      status: "published",
      authoringStep: "deploy",
      updatedAt: now,
    };
  }

  setData(data);
  return created;
}

export function getAssessmentAssignmentsForEmployee(employeeId: string): AssessmentAssignment[] {
  return getData().assessmentAssignments.filter((a) => a.employeeId === employeeId);
}

export function startAssessmentSession(params: {
  assignmentId: string;
  employeeId: string;
  camera: boolean;
  microphone: boolean;
  /** When true, abandon any in-progress session and start fresh. */
  forceNew?: boolean;
}): AssessmentSession {
  const data = getData();
  const assignment = data.assessmentAssignments.find((a) => a.id === params.assignmentId);
  if (!assignment) throw new Error("Assignment not found");
  const assessment = data.assessments.find((a) => a.id === assignment.assessmentId);
  if (!assessment) throw new Error("Assessment not found");

  const existing = data.assessmentSessions.find(
    (s) => s.assignmentId === params.assignmentId && s.employeeId === params.employeeId && s.status === "active"
  );
  if (existing && !params.forceNew) return existing;
  if (existing && params.forceNew) {
    existing.status = "aborted";
    existing.endedAt = new Date().toISOString();
  }

  const now = new Date().toISOString();
  const session: AssessmentSession = {
    id: uid("asess"),
    organisationId: assignment.organisationId,
    assignmentId: assignment.id,
    assessmentId: assessment.id,
    employeeId: params.employeeId,
    startedAt: now,
    permissionGranted: { camera: params.camera, microphone: params.microphone },
    turns: [],
    status: "active",
    currentQuestionIndex: 0,
    adaptiveFollowUpsUsed: 0,
  };
  data.assessmentSessions.push(session);
  if (assignment.status !== "completed") {
    assignment.status = "in_progress";
  }
  setData(data);
  return session;
}

export function saveAssessmentSession(session: AssessmentSession) {
  const data = getData();
  const idx = data.assessmentSessions.findIndex((s) => s.id === session.id);
  if (idx < 0) data.assessmentSessions.push(session);
  else data.assessmentSessions[idx] = session;
  setData(data);
  return session;
}

export function appendAssessmentTurn(sessionId: string, turn: AssessmentTurn) {
  const data = getData();
  const session = data.assessmentSessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status !== "active") {
    return clone(session);
  }
  session.turns.push(turn);
  setData(data);
  return clone(session);
}

export function completeAssessmentSession(
  sessionId: string,
  resultOverride?: AssessmentResult
): AssessmentResult {
  const data = getData();
  const session = data.assessmentSessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");
  const assessment = data.assessments.find((a) => a.id === session.assessmentId);
  if (!assessment) throw new Error("Assessment not found");
  const assignment = data.assessmentAssignments.find((a) => a.id === session.assignmentId);
  if (!assignment) throw new Error("Assignment not found");

  const now = new Date().toISOString();
  session.status = "completed";
  session.endedAt = now;

  const result =
    resultOverride ??
    buildMockAssessmentResult({
      sessionId: session.id,
      assignmentId: session.assignmentId,
      employeeId: session.employeeId,
      assessment,
      turns: session.turns,
    });

  data.assessmentResults = data.assessmentResults.filter((r) => r.sessionId !== session.id);
  data.assessmentResults.push(result);

  assignment.status = "completed";
  assignment.completedAt = now;

  setData(data);
  return result;
}

export function applyGeneratedAssessmentContent(
  assessmentId: string,
  content: {
    persona: Assessment["persona"];
    coreQuestions: Assessment["coreQuestions"];
    rubricSkills: Assessment["rubricSkills"];
  }
): Assessment {
  const data = getData();
  const idx = data.assessments.findIndex((a) => a.id === assessmentId);
  if (idx < 0) throw new Error("Assessment not found");
  const saved: Assessment = {
    ...data.assessments[idx],
    ...content,
    status: "ready",
    authoringStep: "generate",
    updatedAt: new Date().toISOString(),
  };
  data.assessments[idx] = saved;
  setData(data);
  return saved;
}

export function getResultForAssignment(assignmentId: string, employeeId: string): AssessmentResult | undefined {
  return getData().assessmentResults.find(
    (r) => r.assignmentId === assignmentId && r.employeeId === employeeId
  );
}

export function getRewindReplaysForAttempt(attemptId: string): RewindReplay[] {
  return getData().rewindReplays.filter((r) => r.attemptId === attemptId);
}

/** Save a Rewind & Replay alternate choice and return compared scores. */
export function saveRewindReplay(params: {
  attemptId: string;
  stageId: string;
  revisedOptionId: string;
}): RewindReplay {
  const data = getData();
  const attempt = data.attempts.find((a) => a.id === params.attemptId);
  if (!attempt || attempt.status !== "completed") throw new Error("Completed attempt not found");
  const simulation = data.simulations.find((s) => s.id === attempt.simulationId);
  if (!simulation) throw new Error("Simulation not found");

  const originalResponse = attempt.stageResponses.find((r) => r.stageId === params.stageId);
  if (!originalResponse) throw new Error("Original stage response not found");
  const stage = simulation.stages.find((s) => s.id === params.stageId);
  const originalOption = stage?.options.find((o) => o.id === originalResponse.optionId);
  if (!originalOption) throw new Error("Original option not found");

  const revised = scoreWithRevisedChoice({
    simulation,
    attempt,
    stageId: params.stageId,
    revisedOptionId: params.revisedOptionId,
  });

  // Replace any prior replay for same attempt+stage
  data.rewindReplays = data.rewindReplays.filter(
    (r) => !(r.attemptId === params.attemptId && r.stageId === params.stageId)
  );

  const replay: RewindReplay = {
    id: uid("rewind"),
    organisationId: attempt.organisationId,
    attemptId: attempt.id,
    assignmentId: attempt.assignmentId,
    simulationId: attempt.simulationId,
    employeeId: attempt.employeeId,
    stageId: params.stageId,
    originalOptionId: originalOption.id,
    revisedOptionId: revised.revisedOption.id,
    originalConsequence: originalOption.consequence,
    revisedConsequence: revised.consequence,
    originalOverallScore: attempt.overallScore ?? 0,
    revisedOverallScore: revised.overallScore,
    originalCompetencyScores: clone(attempt.competencyScores),
    revisedCompetencyScores: revised.competencyScores,
    createdAt: new Date().toISOString(),
  };
  data.rewindReplays.push(replay);
  setData(data);
  return clone(replay);
}
