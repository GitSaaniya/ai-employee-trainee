/**
 * Migrate legacy app_state blob → normalized collections.
 * Usage: set MONGODB_URI then `node scripts/migrate-mongo-collections.js`
 */
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "skillsim";

if (!uri) {
  console.error("Set MONGODB_URI in the environment (from .env.local).");
  process.exit(1);
}

const COLLECTIONS = {
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
};

const ARRAY_KEYS = [
  ["users", COLLECTIONS.users],
  ["departments", COLLECTIONS.departments],
  ["competencies", COLLECTIONS.competencies],
  ["roles", COLLECTIONS.roles],
  ["roleCompetencies", COLLECTIONS.roleCompetencies],
  ["employeeProfiles", COLLECTIONS.employeeProfiles],
  ["simulations", COLLECTIONS.simulations],
  ["assignments", COLLECTIONS.assignments],
  ["attempts", COLLECTIONS.attempts],
  ["feedbackReports", COLLECTIONS.feedbackReports],
  ["improvementPlans", COLLECTIONS.improvementPlans],
  ["integrations", COLLECTIONS.integrations],
  ["assessments", COLLECTIONS.assessments],
  ["assessmentAssignments", COLLECTIONS.assessmentAssignments],
  ["assessmentSessions", COLLECTIONS.assessmentSessions],
  ["assessmentResults", COLLECTIONS.assessmentResults],
  ["rewindReplays", COLLECTIONS.rewindReplays],
];

function toDoc(entity) {
  const { id, ...rest } = entity;
  return { _id: id, id, ...rest };
}

async function replaceCollection(db, name, items) {
  const col = db.collection(name);
  const ids = (items || []).map((i) => i.id);
  if (!ids.length) {
    await col.deleteMany({});
    return 0;
  }
  await col.deleteMany({ _id: { $nin: ids } });
  await col.bulkWrite(
    items.map((item) => ({
      replaceOne: {
        filter: { _id: item.id },
        replacement: toDoc(item),
        upsert: true,
      },
    })),
    { ordered: false }
  );
  return items.length;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const usersExisting = await db.collection(COLLECTIONS.users).countDocuments();
  let data = null;

  if (usersExisting > 0) {
    console.log(`users already has ${usersExisting} docs — skipping blob import`);
  } else {
    const legacy = await db.collection("app_state").findOne({ _id: "app_data_v1" });
    if (!legacy?.data) {
      console.error("No legacy app_state.data found and users empty");
      process.exit(1);
    }
    data = legacy.data;
    console.log("Migrating from app_state blob…");
  }

  if (data) {
    await db.collection(COLLECTIONS.organisations).replaceOne(
      { _id: data.organisation.id },
      toDoc(data.organisation),
      { upsert: true }
    );
    await db.collection(COLLECTIONS.workspaceSettings).replaceOne(
      { _id: "default" },
      {
        _id: "default",
        demoMode: Boolean(data.demoMode),
        organisationId: data.organisation.id,
        updatedAt: new Date().toISOString(),
      },
      { upsert: true }
    );

    for (const [key, colName] of ARRAY_KEYS) {
      const n = await replaceCollection(db, colName, data[key] || []);
      console.log(`  ${colName}: ${n}`);
    }

    await db.collection("app_state").updateOne(
      { _id: "app_data_v1" },
      {
        $set: {
          migratedAt: new Date().toISOString(),
          note: "Migrated to normalized collections",
        },
        $unset: { data: "" },
      }
    );
  }

  await db.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true });
  await db.collection(COLLECTIONS.employeeProfiles).createIndex({ userId: 1 }, { unique: true });
  await db.collection(COLLECTIONS.assessmentAssignments).createIndex({ assessmentId: 1 });
  await db.collection(COLLECTIONS.assessmentResults).createIndex({ assessmentId: 1 });

  const summary = {};
  for (const name of Object.values(COLLECTIONS)) {
    summary[name] = await db.collection(name).countDocuments();
  }
  console.log("Collection counts:", summary);
  await client.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
