import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB?.trim() || "skillsim";

declare global {
  // Persist the client across hot reloads in development.
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient() {
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  return new MongoClient(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 8000,
  });
}

export function isMongoConfigured() {
  return Boolean(uri);
}

export async function getMongoClient(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!global._mongoClientPromise) {
    const client = createClient();
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}
