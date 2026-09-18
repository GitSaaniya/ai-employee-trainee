import { NextResponse } from "next/server";
import { loadAppDataFromMongo, saveAppDataToMongo } from "@/lib/data/mongo-app-data";
import { isMongoConfigured } from "@/lib/db/mongodb";
import type { AppData } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "MONGODB_URI is not set", configured: false },
      { status: 503 }
    );
  }
  try {
    const data = await loadAppDataFromMongo();
    return NextResponse.json({ configured: true, data });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to load data from MongoDB",
        configured: true,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: "MONGODB_URI is not set", configured: false },
      { status: 503 }
    );
  }
  try {
    const body = (await request.json()) as { data?: AppData };
    if (!body.data || typeof body.data !== "object") {
      return NextResponse.json({ error: "Missing data payload" }, { status: 400 });
    }
    await saveAppDataToMongo(body.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to save data to MongoDB",
      },
      { status: 500 }
    );
  }
}
