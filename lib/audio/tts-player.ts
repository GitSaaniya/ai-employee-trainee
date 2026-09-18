import { stopSpeaking as stopBrowserTts } from "@/lib/assessment/mock-engine";

export type TtsPlayer = {
  playBase64Audio: (base64: string, mime?: string) => Promise<"ended" | "stopped">;
  playBrowserSpeech: (text: string) => Promise<"ended" | "stopped">;
  stop: () => void;
  isPlaying: () => boolean;
};

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
    playBrowserSpeech: (text: string) =>
      new Promise<"ended" | "stopped">((resolve) => {
        if (settle) finish("stopped");
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve("ended");
          return;
        }
        playing = true;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.02;
        settle = resolve;
        utter.onend = () => finish("ended");
        utter.onerror = () => finish("stopped");
        window.speechSynthesis.speak(utter);
      }),
  };
}
