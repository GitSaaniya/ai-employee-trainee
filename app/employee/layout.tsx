import { AppShell } from "@/components/layout/app-shell";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="employee">{children}</AppShell>;
}
