import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieValue } from "@/lib/auth";
import { COLLECTIONS } from "@/lib/db/collections";
import { getDb, isMongoConfigured } from "@/lib/db/mongodb";
import type { AppSession } from "@/lib/types";

function env(name: string, fallback = "") {
  return (process.env[name] ?? fallback).trim();
}

type MongoUser = {
  _id?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  organisationId?: string;
};

async function findUserByEmail(email: string): Promise<MongoUser | null> {
  if (!isMongoConfigured()) return null;
  const db = await getDb();
  const exact = await db.collection<MongoUser>(COLLECTIONS.users).findOne({
    email,
  });
  if (exact) return exact;
  // Case-insensitive fallback
  const all = await db
    .collection<MongoUser>(COLLECTIONS.users)
    .find({}, { projection: { email: 1, name: 1, role: 1, organisationId: 1, id: 1, _id: 1 } })
    .toArray();
  return all.find((u) => (u.email || "").toLowerCase() === email) ?? null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const adminEmail = env("ADMIN_EMAIL", "admin@skillsim.ai").toLowerCase();
    const adminPassword = env("ADMIN_PASSWORD");
    const employeePassword = env("EMPLOYEE_PASSWORD");
    const adminName = env("ADMIN_NAME", "Aisha Khan");

    if (!adminPassword || !employeePassword) {
      return NextResponse.json(
        {
          error:
            "Auth is not configured. Set ADMIN_PASSWORD and EMPLOYEE_PASSWORD in .env.local",
        },
        { status: 500 }
      );
    }

    let session: AppSession;

    if (email === adminEmail) {
      if (password !== adminPassword) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      const adminUser = await findUserByEmail(email);
      session = {
        userId: adminUser?.id || adminUser?._id || "user_admin_1",
        email: adminEmail,
        name: adminUser?.name || adminName,
        role: "admin",
        organisationId: adminUser?.organisationId || "org_meridian",
      };
    } else {
      if (password !== employeePassword) {
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const user = await findUserByEmail(email);
      if (!user || user.role !== "employee") {
        return NextResponse.json(
          { error: "Employee not found. Ask an admin to add your email first." },
          { status: 401 }
        );
      }

      session = {
        userId: user.id || String(user._id),
        email: (user.email || email).toLowerCase(),
        name: user.name || email.split("@")[0] || "Employee",
        role: "employee",
        organisationId: user.organisationId || "org_meridian",
      };
    }

    const response = NextResponse.json({ session });
    response.cookies.set(SESSION_COOKIE, sessionCookieValue(session), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error("Login error", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
