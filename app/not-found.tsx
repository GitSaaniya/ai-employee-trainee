import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="experience-theme flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center text-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#007BFF] text-lg font-bold text-[#0B0E14] shadow-[0_0_20px_rgba(0,229,255,0.35)]">
        G
      </div>
      <h1 className="font-[family-name:var(--font-experience-display)] text-2xl text-white">Page not found</h1>
      <p className="max-w-md text-sm text-white/50">
        The page you requested does not exist or may have moved.
      </p>
      <Button asChild>
        <Link href="/login">Back to login</Link>
      </Button>
    </div>
  );
}
