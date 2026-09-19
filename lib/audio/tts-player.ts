import { stopSpeaking as stopBrowserTts } from "@/lib/assessment/mock-engine";
import type { AgentGender } from "@/lib/assessment/voices";

export type TtsPlayer = {
  playBase64Audio: (base64: string, mime?: string) => Promise<"ended" | "stopped">;
  playBrowserSpeech: (
    text: string,
    opts?: { gender?: AgentGender }
  ) => Promise<"ended" | "stopped">;
  stop: () => void;
  isPlaying: () => boolean;
};

function pickBrowserVoice(gender: AgentGender = "female"): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferFemale =
    gender === "female"
      ? /female|zira|samantha|susan|karen|moira|tessa|veena|neerja|heera|raveena|google uk english female|microsoft jenny|aria|sonia/i
      : /male|david|mark|george|daniel|ravi|google uk english male|microsoft guy|andrew|brian/i;

  const english = voices.filter((v) => /en(-|_|\b)/i.test(v.lang) || /english/i.test(v.name));
  const pool = english.length ? english : voices;

  return (
    pool.find((v) => preferFemale.test(v.name)) ||
    pool.find((v) => (gender === "female" ? /zira|samantha|jenny|aria/i.test(v.name) : /david|mark|guy/i.test(v.name))) ||
    pool[0] ||
    null
  );
}

/** TTS player with barge-in stop that settles pending play promises. */
export function createTtsPlayer(): TtsPlayer {
  let audioEl: HTMLAudioElement | null = null;
  let playing = false;
  let objectUrl: string | null = null;
  let settle: ((reason: "ended" | "stopped") => void) | null = null;

  const cleanup = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    if (audioEl) {
      audioEl.onended = null;
      audioEl.onerror = null;
      audioEl.pause();
      audioEl.src = "";
      audioEl = null;
    }
    playing = false;
  };

  const finish = (reason: "ended" | "stopped") => {
    const done = settle;
    settle = null;
    cleanup();
    done?.(reason);
  };

  return {
    isPlaying: () => playing,
    stop: () => {
      stopBrowserTts();
      if (settle || playing) finish("stopped");
      else cleanup();
    },
    playBase64Audio: (base64: string, mime = "audio/wav") =>
      new Promise<"ended" | "stopped">((resolve, reject) => {
        if (settle) finish("stopped");
        try {
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });
          objectUrl = URL.createObjectURL(blob);
          audioEl = new Audio(objectUrl);
          playing = true;
          settle = resolve;
          audioEl.onended = () => finish("ended");
          audioEl.onerror = () => {
            settle = null;
            cleanup();
            reject(new Error("TTS playback failed"));
          };
          void audioEl.play().catch((err) => {
            settle = null;
            cleanup();
            reject(err);
          });
        } catch (err) {
          settle = null;
          cleanup();
          reject(err);
        }
      }),
    playBrowserSpeech: (text: string, opts) =>
      new Promise<"ended" | "stopped">((resolve) => {
        if (settle) finish("stopped");
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve("ended");
          return;
        }
        playing = true;
        window.speechSynthesis.cancel();

        const speak = () => {
          const utter = new SpeechSynthesisUtterance(text);
          const voice = pickBrowserVoice(opts?.gender ?? "female");
          if (voice) {
            utter.voice = voice;
            utter.lang = voice.lang || "en-IN";
          } else {
            utter.lang = "en-IN";
          }
          // Slightly slower + higher pitch reads less robotic on fallback voices
          utter.rate = 0.95;
          utter.pitch = opts?.gender === "male" ? 0.95 : 1.15;
          settle = resolve;
          utter.onend = () => finish("ended");
          utter.onerror = () => finish("stopped");
          window.speechSynthesis.speak(utter);
        };

        // Chrome often returns [] until voiceschanged fires
        const existing = window.speechSynthesis.getVoices();
        if (existing.length) {
          speak();
        } else {
          const onVoices = () => {
            window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
            speak();
          };
          window.speechSynthesis.addEventListener("voiceschanged", onVoices);
          window.setTimeout(() => {
            window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
            speak();
          }, 400);
        }
      }),
  };
}
