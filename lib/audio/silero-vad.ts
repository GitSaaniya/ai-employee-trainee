"use client";

import {
  audioConfig,
  passesMinVolume,
  passesMinVolumeLinear,
  rmsToDb,
} from "@/lib/audio/config";
import { encodeWavFromFloat32, rmsOfFloat32 } from "@/lib/audio/wav";

export type SileroCallbacks = {
  onSpeechStart?: () => void;
  onSpeechEnd?: (wav: Blob, meta: { durationMs: number; rmsDb: number }) => void;
  onSpeechEndPcm?: (pcm: Float32Array, meta: { durationMs: number; rmsDb: number }) => void;
  onFrame?: (rmsApprox: number, speech: boolean) => void;
  onBargeInSpeech?: () => void;
  onError?: (err: Error) => void;
};

/**
 * Silero VAD — softer thresholds so full spoken sentences reach STT.
 * stop ~1.2s · confidence 0.5 · min volume 0.08
 */
export async function startSileroVad(
  stream: MediaStream,
  callbacks: SileroCallbacks,
  opts?: { bargeInArmed?: () => boolean }
): Promise<{ stop: () => Promise<void>; pause: () => Promise<void>; start: () => Promise<void>; ready: boolean }> {
  let speechStartedAt = 0;
  let bargeTimer: ReturnType<typeof setTimeout> | null = null;

  try {
    const { MicVAD } = await import("@ricky0123/vad-web");
    const positive = audioConfig.sileroVadConfidence;
    const vad = await MicVAD.new({
      model: "v5",
      startOnLoad: false,
      positiveSpeechThreshold: positive,
      negativeSpeechThreshold: Math.max(0.15, positive - 0.15),
      redemptionMs: audioConfig.vadRedemptionMs,
      preSpeechPadMs: audioConfig.vadPreSpeechPadMs,
      minSpeechMs: audioConfig.minSpeechMs,
      submitUserSpeechOnPause: true,
      getStream: async () => stream,
      pauseStream: async () => undefined,
      resumeStream: async () => stream,
      onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
      baseAssetPath: "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.31/dist/",
      onFrameProcessed: (probabilities, frame) => {
        const isSpeech = (probabilities.isSpeech ?? 0) > positive;
        const rms = rmsOfFloat32(frame);
        callbacks.onFrame?.(rms, isSpeech);

        if (opts?.bargeInArmed?.() && isSpeech && passesMinVolume(rms, audioConfig.bargeInMinVolumeDb)) {
          if (!bargeTimer) {
            bargeTimer = setTimeout(() => {
              bargeTimer = null;
              if (opts.bargeInArmed?.()) callbacks.onBargeInSpeech?.();
            }, audioConfig.bargeInDebounceMs);
          }
        } else if (bargeTimer) {
          clearTimeout(bargeTimer);
          bargeTimer = null;
        }
      },
      onSpeechStart: () => {
        speechStartedAt = Date.now();
        callbacks.onSpeechStart?.();
      },
      onSpeechEnd: (audio) => {
        const durationMs = Date.now() - (speechStartedAt || Date.now());
        const rms = rmsOfFloat32(audio);
        const db = rmsToDb(rms);

        if (!passesMinVolumeLinear(rms)) return;
        if (durationMs < audioConfig.minSpeechMs) return;

        const meta = { durationMs, rmsDb: db };
        callbacks.onSpeechEndPcm?.(audio, meta);
        const wav = encodeWavFromFloat32(audio, 16000);
        callbacks.onSpeechEnd?.(wav, meta);
      },
    });

    await vad.start();

    return {
      ready: true,
      start: () => vad.start(),
      pause: () => vad.pause(),
      stop: async () => {
        if (bargeTimer) clearTimeout(bargeTimer);
        try {
          await vad.pause();
          await vad.destroy();
        } catch {
          // ignore
        }
      },
    };
  } catch (err) {
    callbacks.onError?.(err instanceof Error ? err : new Error("Silero VAD failed to load"));
    return {
      ready: false,
      start: async () => undefined,
      pause: async () => undefined,
      stop: async () => undefined,
    };
  }
}
