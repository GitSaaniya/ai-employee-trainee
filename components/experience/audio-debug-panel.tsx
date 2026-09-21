"use client";

import { cn } from "@/lib/utils";

export function AudioDebugPanel({
  open,
  rmsDb,
  vadSpeech,
  smartTurn,
  engine,
  className,
}: {
  open: boolean;
  rmsDb: number;
  vadSpeech: boolean;
  smartTurn: string;
  engine: string;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-400/30 bg-amber-950/40 p-3 font-mono text-[11px] text-amber-100/90",
        className
      )}
    >
      <div className="mb-1 font-semibold tracking-wide text-amber-200 uppercase">Audio debug</div>
      <div>RMS dB: {rmsDb.toFixed(1)}</div>
      <div>VAD speech: {vadSpeech ? "yes" : "no"}</div>
      <div>Smart turn: {smartTurn}</div>
      <div>Engine: {engine}</div>
    </div>
  );
}
