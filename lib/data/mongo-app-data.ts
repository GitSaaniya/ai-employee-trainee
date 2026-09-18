import type { AppData } from "@/lib/types";
import { createSeedData } from "@/lib/data/seed";
import {
  ARRAY_ENTITY_KEYS,
  COLLECTIONS,
  ensureIndexes,
} from "@/lib/db/collections";
import { getDb, isMongoConfigured } from "@/lib/db/mongodb";

const LEGACY_BLOB_ID = "app_data_v1";
const WORKSPACE_SETTINGS_ID = "default";

type EntityDoc = { _id: string; [key: string]: unknown };

function toDoc<T extends { id: string }>(entity: T): EntityDoc {
  const { id, ...rest } = entity;
  return { _id: id, id, ...rest };
}

function fromDoc<T extends { id: string }>(doc: EntityDoc): T {
  const { _id, ...rest } = doc;
  return { ...rest, id: (rest.id as string) || _id } as T;
}

async function replaceCollection<T extends { id: string }>(
  collectionName: string,
  items: T[]
) {
  const db = await getDb();
  const col = db.collection<EntityDoc>(collectionName);
  const ids = items.map((i) => i.id);
  if (ids.length === 0) {
    await col.deleteMany({});
    return;
  }
  await col.deleteMany({ _id: { $nin: ids } });
  if (items.length) {
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
  }
}

async function loadCollection<T extends { id: string }>(collectionName: string): Promise<T[]> {
  const db = await getDb();
  const docs = await db.collection<EntityDoc>(collectionName).find({}).toArray();
  return docs.map((d) => fromDoc<T>(d));
}

/** One-time: copy legacy `app_state` blob into normalized collections. */
export async function migrateLegacyBlobIfNeeded(): Promise<boolean> {
  const db = await getDb();
  const usersCount = await db.collection(COLLECTIONS.users).countDocuments();
  if (usersCount > 0) return false;

  const legacy = await db.collection("app_state").findOne<{ data?: AppData }>({ _id: LEGACY_BLOB_ID });
  if (!legacy?.data) return false;

  await saveAppDataToMongo(legacy.data);
  await db.collection("app_state").updateOne(
    { _id: LEGACY_BLOB_ID },
    {
      $set: {
        migratedAt: new Date().toISOString(),
        note: "Migrated to normalized collections. Safe to ignore/delete.",
      },
      $unset: { data: "" },
    }
  );
  return true;
}

export async function loadAppDataFromMongo(): Promise<AppData> {
  if (!isMongoConfigured()) {
    throw new Error("MongoDB is not configured");
  }

  const db = await getDb();
  await ensureIndexes(db);
  await migrateLegacyBlobIfNeeded();

  const users = await loadCollection<AppData["users"][number]>(COLLECTIONS.users);
  if (!users.length) {
    const seed = createSeedData();
    await saveAppDataToMongo(seed);
    return seed;
  }

  const [
    organisationDoc,
    departments,
    competencies,
    roles,
    roleCompetencies,
    employeeProfiles,
    simulations,
    assignments,
    attempts,
    feedbackReports,
    improvementPlans,
    integrations,
    assessments,
    assessmentAssignments,
    assessmentSessions,
    assessmentResults,
    rewindReplays,
    settings,
  ] = await Promise.all([
    db.collection(COLLECTIONS.organisations).findOne({}),
    loadCollection<AppData["departments"][number]>(COLLECTIONS.departments),
    loadCollection<AppData["competencies"][number]>(COLLECTIONS.competencies),
    loadCollection<AppData["roles"][number]>(COLLECTIONS.roles),
    loadCollection<AppData["roleCompetencies"][number]>(COLLECTIONS.roleCompetencies),
    loadCollection<AppData["employeeProfiles"][number]>(COLLECTIONS.employeeProfiles),
    loadCollection<AppData["simulations"][number]>(COLLECTIONS.simulations),
    loadCollection<AppData["assignments"][number]>(COLLECTIONS.assignments),
    loadCollection<AppData["attempts"][number]>(COLLECTIONS.attempts),
    loadCollection<AppData["feedbackReports"][number]>(COLLECTIONS.feedbackReports),
    loadCollection<AppData["improvementPlans"][number]>(COLLECTIONS.improvementPlans),
    loadCollection<AppData["integrations"][number]>(COLLECTIONS.integrations),
    loadCollection<AppData["assessments"][number]>(COLLECTIONS.assessments),
    loadCollection<AppData["assessmentAssignments"][number]>(COLLECTIONS.assessmentAssignments),
    loadCollection<AppData["assessmentSessions"][number]>(COLLECTIONS.assessmentSessions),
    loadCollection<AppData["assessmentResults"][number]>(COLLECTIONS.assessmentResults),
    loadCollection<AppData["rewindReplays"][number]>(COLLECTIONS.rewindReplays),
    db.collection<{ _id: string; demoMode?: boolean }>(COLLECTIONS.workspaceSettings).findOne({
      _id: WORKSPACE_SETTINGS_ID,
    }),
  ]);

  const organisation = organisationDoc
    ? fromDoc<AppData["organisation"]>(organisationDoc as unknown as EntityDoc)
    : createSeedData().organisation;

  return {
    organisation,
    users,
    departments,
    competencies,
    roles,
    roleCompetencies,
    employeeProfiles,
    simulations,
    assignments,
    attempts,
    feedbackReports,
    improvementPlans,
    integrations,
    assessments,
    assessmentAssignments,
    assessmentSessions,
    assessmentResults,
    rewindReplays: rewindReplays ?? [],
    demoMode: Boolean(settings?.demoMode),
  };
}

export async function saveAppDataToMongo(data: AppData): Promise<void> {
  if (!isMongoConfigured()) {
    throw new Error("MongoDB is not configured");
  }

  const db = await getDb();
  await ensureIndexes(db);

  await db.collection(COLLECTIONS.organisations).replaceOne(
    { _id: data.organisation.id },
    toDoc(data.organisation),
    { upsert: true }
  );

  await db.collection(COLLECTIONS.workspaceSettings).replaceOne(
    { _id: WORKSPACE_SETTINGS_ID },
    {
      _id: WORKSPACE_SETTINGS_ID,
      demoMode: data.demoMode,
      organisationId: data.organisation.id,
      updatedAt: new Date().toISOString(),
    },
    { upsert: true }
  );

  await Promise.all(
    ARRAY_ENTITY_KEYS.map((key) => {
      const collectionName = COLLECTIONS[key];
      const items = data[key] as { id: string }[];
      return replaceCollection(collectionName, items ?? []);
    })
  );
}
