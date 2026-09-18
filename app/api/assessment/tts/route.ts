import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().min(1).max(2500),
  speaker: z.string().optional(),
  languageCode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({
        source: "browser",
        fallback: "speechSynthesis",
        warning: "SARVAM_API_KEY not set; client should use browser TTS",
      });
    }

    const { text, speaker, languageCode } = parsed.data;

    try {
      const res = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          target_language_code: languageCode || process.env.SARVAM_LANGUAGE || "en-IN",
          model: process.env.SARVAM_TTS_MODEL || "bulbul:v3",
          speaker: speaker || process.env.SARVAM_SPEAKER || "ritu",
          pace: 1.0,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Sarvam TTS error: ${res.status} ${errText}`);
      }

      const data = (await res.json()) as { audios?: string[] };
      const audio = data.audios?.[0];
      if (!audio) throw new Error("Sarvam returned no audio");

      return NextResponse.json({
        source: "sarvam",
        audioBase64: audio,
        mimeType: "audio/wav",
      });
    } catch (err) {
      return NextResponse.json({
        source: "browser",
        fallback: "speechSynthesis",
        warning: err instanceof Error ? err.message : "Sarvam TTS failed",
      });
    }
  } catch {
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
