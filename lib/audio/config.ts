/** Client/server shared interview audio tunables.
 * Softened so mid-sentence pauses don't cut STT short.
 * Env overrides: NEXT_PUBLIC_SILERO_* 
 */
function envNum(name: string, fallback: number) {
  const raw = process.env[name] ?? process.env[`NEXT_PUBLIC_${name}`];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Wait longer through natural pauses before ending the turn */
const stopSecs = envNum("SILERO_STOP_SECS", 1.2);
const startSecs = envNum("SILERO_START_SECS", 0.15);
/** Lower = less likely to drop quiet syllables / early cutoffs */
const vadConfidence = envNum("SILERO_VAD_CONFIDENCE", 0.5);
const minVolumeLinear = envNum("SILERO_MIN_VOLUME", 0.08);

export const audioConfig = {
  minVolumeLinear,
  minVolumeDb: 20 * Math.log10(Math.max(minVolumeLinear, 1e-8)),
  bargeInMinVolumeDb: Number(process.env.NEXT_PUBLIC_BARGE_IN_MIN_VOLUME_DB ?? -28),
  bargeInDebounceMs: Number(process.env.NEXT_PUBLIC_BARGE_IN_DEBOUNCE_MS ?? 220),

  sileroVadConfidence: vadConfidence,
  /** Silence after speech before Silero end-of-utterance */
  vadRedemptionMs: Math.round(stopSecs * 1000),
  minSpeechMs: Math.round(startSecs * 1000),
  /** Keep a bit of lead-in audio for Gladia */
  vadPreSpeechPadMs: 400,
  /**
   * After Silero says speech ended, wait again so the learner can continue the sentence.
   * Chunks are stitched in interview-stage before STT.
   */
  utteranceFinalizeMs: Math.max(900, Math.round(stopSecs * 1000)),

  maxUtteranceMs: 45000,
  silenceFallbackMs: 3500,
  postTtsSettleMs: 250,
  minSttConfidence: Number(process.env.NEXT_PUBLIC_MIN_STT_CONFIDENCE ?? 0.15),
  minTranscriptWords: 1,
  sessionTimeBoxMinutes: 5,
};

export function rmsToDb(rms: number): number {
  if (rms <= 1e-8) return -100;
  return 20 * Math.log10(rms);
}

export function passesMinVolume(rms: number, thresholdDb = audioConfig.minVolumeDb): boolean {
  return rmsToDb(rms) >= thresholdDb;
}

export function passesMinVolumeLinear(rms: number, threshold = audioConfig.minVolumeLinear): boolean {
  return rms >= threshold;
}

export function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
