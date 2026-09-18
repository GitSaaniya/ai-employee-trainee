"use client";

import { cn } from "@/lib/utils";

/**
 * Map raw PCM RMS (often 0.02–0.20 while speaking) into a visible 0–1 meter range.
 * Linear `rms * 100` under-reads and looks "broken" on laptop mics.
 */
export function normalizeMicLevel(rms: number): number {
  const floor = 0.008;
  const ceiling = 0.18;
  if (!Number.isFinite(rms) || rms <= floor) return 0;
  const t = Math.min(1, Math.max(0, (rms - floor) / (ceiling - floor)));
  // Slight boost so quiet-but-real speech still lights several bars
  return Math.min(1, Math.pow(t, 0.65));
}

export function MicMeter({
  level,
  active,
  className,
}: {
  /** Raw RMS 0–1 from the audio pipeline (will be normalized for display). */
  level: number;
  active?: boolean;
  className?: string;
}) {
  const display = normalizeMicLevel(level);
  const bars = 12;

  return (
    <div
      className={cn("flex items-end gap-0.5", className)}
      aria-hidden
      title={`Mic ${Math.round(display * 100)}%`}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i + 0.35) / bars;
        const lit = display >= threshold;
        const hot = display >= 0.85 && i >= bars - 2;
        return (
          <span
            key={i}
            className={cn(
              "w-1 rounded-sm transition-[background-color,opacity] duration-75",
              lit
                ? hot
                  ? "bg-amber-300"
                  : active
                    ? "bg-[#00E5FF]"
                    : "bg-white/55"
                : "bg-white/15"
            )}
            style={{ height: 6 + i * 1.5 }}
          />
        );
      })}
    </div>
  );
}

export function InterviewStatusChip({
  state,
}: {
  state: string;
}) {
  const labels: Record<string, string> = {
    idle: "Idle",
    requesting_permissions: "Requesting permissions…",
    ready: "Ready",
    speaking: "AI speaking",
    listening: "Listening",
    turn_pending: "Detecting end of turn…",
    transcribing: "Transcribing…",
    thinking: "Thinking…",
    interrupted: "Interrupted",
    complete: "Complete",
    error: "Error",
  };
  const glow =
    state === "listening" || state === "turn_pending"
      ? "border-[#00E5FF]/40 text-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.2)]"
      : state === "speaking"
        ? "border-blue-400/40 text-blue-200"
        : state === "interrupted"
          ? "border-amber-400/40 text-amber-200"
          : "border-white/15 text-white/70";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-black/40 px-3 py-1 text-xs font-medium capitalize",
        glow
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          state === "listening" ? "animate-pulse bg-[#00E5FF]" : "bg-current"
        )}
      />
      {labels[state] ?? state}
    </span>
  );
}
