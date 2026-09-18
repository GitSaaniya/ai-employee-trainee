import type { UserRole } from "@/lib/types";

/** Client-safe demo account list (mirrors lib/auth). */
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
