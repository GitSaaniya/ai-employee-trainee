import { audioConfig, passesMinVolumeLinear, rmsToDb } from "@/lib/audio/config";
import { rmsOfFloat32 } from "@/lib/audio/wav";

/** Heuristic + Gladia confidence checks so noise hallucinations never become user turns. */
export function averageConfidence(
  utterances: { confidence?: number; words?: { confidence?: number }[] }[] | undefined
): number | null {
  if (!utterances?.length) return null;
  const scores: number[] = [];
  for (const u of utterances) {
    if (typeof u.confidence === "number") scores.push(u.confidence);
    for (const w of u.words ?? []) {
      if (typeof w.confidence === "number") scores.push(w.confidence);
    }
  }
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type TranscriptRejectReason = "empty" | "low_confidence" | "too_short" | "weak_audio";

/**
 * Accept almost any non-empty Gladia transcript.
 * Confidence is advisory only — rejecting on low confidence caused too many false "couldn't hear you" toasts.
 */
export function evaluateTranscript(
  text: string,
  _confidence: number | null
): { ok: true } | { ok: false; reason: TranscriptRejectReason } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  // Allow single-word answers ("yes", "ok") — only block pure noise placeholders
  if (wordCount(trimmed) < 1) return { ok: false, reason: "too_short" };
  return { ok: true };
}

export function evaluatePcmUtterance(pcm: Float32Array): {
  ok: boolean;
  durationMs: number;
  rmsDb: number;
} {
  const durationMs = (pcm.length / 16000) * 1000;
  const rms = rmsOfFloat32(pcm);
  const db = rmsToDb(rms);
  // Soft gate: only drop near-silent / tiny blips (not borderline speech)
  const ok =
    pcm.length > 0 &&
    durationMs >= Math.min(audioConfig.minSpeechMs, 120) &&
    (passesMinVolumeLinear(rms) || rms >= 0.02);
  return { ok, durationMs, rmsDb: db };
}
