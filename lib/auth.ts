import { cookies } from "next/headers";
import type { AppSession, UserRole } from "@/lib/types";

export const SESSION_COOKIE = "skillsim_session";

export async function getServerSession(): Promise<AppSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw)) as AppSession;
  } catch {
    return null;
  }
}

export function sessionCookieValue(session: AppSession) {
  return encodeURIComponent(JSON.stringify(session));
}

export function demoAccounts(): { email: string; role: UserRole; name: string; userId: string }[] {
  return [
    {
      email: "admin@skillsim.ai",
      role: "admin",
      name: "Aisha Khan",
      userId: "user_admin_1",
    },
    {
      email: "manu.nair@knolskape.in",
      role: "employee",
      name: "Manu Nair",
      userId: "user_emp_demo",
    },
  ];
}
