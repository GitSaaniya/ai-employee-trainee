"use client";

type LiveHandlers = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onStatus?: (status: "connecting" | "live" | "idle" | "error") => void;
  onError?: (message: string) => void;
};

function downsample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;
  const ratio = inputRate / outputRate;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const idx = Math.floor(i * ratio);
    out[i] = input[idx] ?? 0;
  }
  return out;
}

function floatTo16BitBase64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Enterprise live STT client (Gladia).
 * Session URL is minted server-side; audio streams from the browser over WSS.
 */
export class LiveSttClient {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private muted = true;
  private closed = true;
  private handlers: LiveHandlers = {};

  setHandlers(handlers: LiveHandlers) {
    this.handlers = handlers;
  }

  async start(stream: MediaStream): Promise<boolean> {
    await this.stop();
    this.closed = false;
    this.handlers.onStatus?.("connecting");

    try {
      const res = await fetch("/api/assessment/stt/live", { method: "POST" });
      const payload = (await res.json()) as { url?: string; error?: string; configured?: boolean };
      if (!res.ok || !payload.url) {
        this.handlers.onStatus?.("idle");
        if (payload.configured === false) return false;
        this.handlers.onError?.(payload.error || "Live STT unavailable");
        return false;
      }

      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(payload.url!);
        this.ws = ws;
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("Live STT socket failed"));
        ws.onclose = () => {
          if (!this.closed) this.handlers.onStatus?.("idle");
        };
        ws.onmessage = (event) => this.handleMessage(event.data);
      });

      const audioCtx = new AudioContext();
      this.audioCtx = audioCtx;
      if (audioCtx.state === "suspended") await audioCtx.resume();

      const source = audioCtx.createMediaStreamSource(stream);
      // 4096 keeps latency reasonable without flooding the socket
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      this.source = source;
      this.processor = processor;

      processor.onaudioprocess = (ev) => {
        if (this.muted || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        const input = ev.inputBuffer.getChannelData(0);
        const down = downsample(input, audioCtx.sampleRate, 16000);
        if (!down.length) return;
        const chunk = floatTo16BitBase64(down);
        this.ws.send(JSON.stringify({ type: "audio_chunk", data: { chunk } }));
      };

      // Keep processor alive without audible feedback
      const mute = audioCtx.createGain();
      mute.gain.value = 0;
      source.connect(processor);
      processor.connect(mute);
      mute.connect(audioCtx.destination);

      this.muted = false;
      this.handlers.onStatus?.("live");
      return true;
    } catch (err) {
      this.handlers.onStatus?.("error");
      this.handlers.onError?.(err instanceof Error ? err.message : "Live STT failed");
      await this.stop();
      return false;
    }
  }

  setListening(active: boolean) {
    this.muted = !active;
  }

  private handleMessage(raw: unknown) {
    try {
      const message = typeof raw === "string" ? JSON.parse(raw) : JSON.parse(String(raw));
      if (message?.type !== "transcript") return;
      const text = String(message?.data?.utterance?.text || "").trim();
      if (!text) return;
      if (message.data.is_final) this.handlers.onFinal?.(text);
      else this.handlers.onPartial?.(text);
    } catch {
      // ignore malformed frames
    }
  }

  async stop() {
    this.closed = true;
    this.muted = true;
    try {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "stop_recording" }));
        this.ws.close();
      }
    } catch {
      // ignore
    }
    this.ws = null;

    try {
      this.processor?.disconnect();
      this.source?.disconnect();
      await this.audioCtx?.close();
    } catch {
      // ignore
    }
    this.processor = null;
    this.source = null;
    this.audioCtx = null;
    this.handlers.onStatus?.("idle");
  }
}
