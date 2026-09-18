import { NextResponse } from "next/server";
import { mockUserAnswerForQuestion } from "@/lib/assessment/mock-engine";
import { averageConfidence } from "@/lib/audio/stt-quality";

export const runtime = "nodejs";

type GladiaUtterance = {
  text?: string;
  confidence?: number;
  words?: { word?: string; confidence?: number }[];
};

type GladiaPollResult = {
  status?: string;
  result?: {
    transcription?: {
      full_transcript?: string;
      utterances?: GladiaUtterance[];
      sentences?: { sentence?: string; text?: string }[];
    };
  };
};

async function pollGladia(
  resultUrl: string,
  apiKey: string,
  attempts = 90
): Promise<{ text: string; confidence: number | null }> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(resultUrl, {
      headers: { "x-gladia-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gladia poll error: ${res.status} ${text}`);
    }
    const data = (await res.json()) as GladiaPollResult;
    if (data.status === "done") {
      const utterances = data.result?.transcription?.utterances;
      const confidence = averageConfidence(utterances);
      const full = data.result?.transcription?.full_transcript?.trim();
      if (full) return { text: full, confidence };
      const fromSentences = data.result?.transcription?.sentences
        ?.map((s) => s.sentence || s.text)
        .filter(Boolean)
        .join(" ")
        .trim();
      if (fromSentences) return { text: fromSentences, confidence };
      const joined = utterances
        ?.map((u) => u.text)
        .filter(Boolean)
        .join(" ")
        .trim();
      return { text: joined || "", confidence };
    }
    if (data.status === "error") throw new Error("Gladia transcription failed");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Gladia transcription timed out");
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const questionIndex = Number(form.get("questionIndex") ?? 0);
    const apiKey = process.env.GLADIA_API_KEY?.trim();
    const allowDemoFallback = process.env.STT_ALLOW_DEMO_FALLBACK === "1";

    if (!apiKey) {
      return NextResponse.json({
        source: "demo_ai",
        text: mockUserAnswerForQuestion(questionIndex),
        warning: "GLADIA_API_KEY not set; used mock STT",
      });
    }

    if (!(audio instanceof Blob) || audio.size < 100) {
      return NextResponse.json(
        { rejected: true, reason: "empty_audio", error: "Missing or empty audio" },
        { status: 400 }
      );
    }

    try {
      const uploadForm = new FormData();
      uploadForm.append("audio", audio, "utterance.wav");

      const uploadRes = await fetch("https://api.gladia.io/v2/upload", {
        method: "POST",
        headers: { "x-gladia-key": apiKey },
        body: uploadForm,
      });
      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(`Gladia upload failed: ${uploadRes.status} ${text}`);
      }
      const uploaded = (await uploadRes.json()) as { audio_url?: string };
      if (!uploaded.audio_url) throw new Error("Gladia upload missing audio_url");

      const initRes = await fetch("https://api.gladia.io/v2/pre-recorded", {
        method: "POST",
        headers: {
          "x-gladia-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_url: uploaded.audio_url,
          model: "solaria-1",
          language_config: { languages: ["en"], code_switching: false },
          sentences: true,
          punctuation_enhanced: true,
        }),
      });
      if (!initRes.ok) {
        const text = await initRes.text();
        throw new Error(`Gladia init failed: ${initRes.status} ${text}`);
      }
      const job = (await initRes.json()) as { result_url?: string; id?: string };
      const resultUrl =
        job.result_url ||
        (job.id ? `https://api.gladia.io/v2/pre-recorded/${job.id}` : "");
      if (!resultUrl) throw new Error("Gladia missing result_url");

      const { text, confidence } = await pollGladia(resultUrl, apiKey);
      const trimmed = text.trim();
      if (!trimmed) {
        return NextResponse.json({
          source: "gladia",
          rejected: true,
          reason: "empty",
          confidence,
          text: "",
          warning: "No speech detected — please speak again",
        });
      }

      return NextResponse.json({
        source: "gladia",
        text: trimmed,
        confidence,
      });
    } catch (err) {
      if (allowDemoFallback) {
        return NextResponse.json({
          source: "demo_ai",
          text: mockUserAnswerForQuestion(questionIndex),
          warning: err instanceof Error ? err.message : "Gladia STT failed; used mock",
        });
      }
      return NextResponse.json({
        source: "gladia",
        rejected: true,
        reason: "stt_error",
        text: "",
        warning: err instanceof Error ? err.message : "Speech recognition failed — try again",
      });
    }
  } catch {
    return NextResponse.json({ error: "STT failed" }, { status: 500 });
  }
}
