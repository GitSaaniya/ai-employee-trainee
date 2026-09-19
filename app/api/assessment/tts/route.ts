import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAssessorVoice } from "@/lib/assessment/voices";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().min(1).max(2500),
  speaker: z.string().optional(),
  gender: z.enum(["female", "male"]).optional(),
  languageCode: z.string().optional(),
});

async function sarvamSpeak(params: {
  apiKey: string;
  text: string;
  speaker: string;
  languageCode: string;
  model: string;
  pace: number;
  temperature: number;
  sampleRate: number;
}) {
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "api-subscription-key": params.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: params.text,
      // Official REST field is language_code (required)
      language_code: params.languageCode,
      model: params.model,
      speaker: params.speaker,
      pace: params.pace,
      temperature: params.temperature,
      speech_sample_rate: params.sampleRate,
      output_audio_codec: "wav",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sarvam TTS error: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { audios?: string[] };
  const audio = data.audios?.[0];
  if (!audio) throw new Error("Sarvam returned no audio");
  return audio;
}

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

    const { text, speaker, gender, languageCode } = parsed.data;
    const voice = resolveAssessorVoice({
      gender,
      voiceId: speaker,
      nameHint: speaker,
    });

    const model = process.env.SARVAM_TTS_MODEL?.trim() || "bulbul:v3";
    const envPace = Number(process.env.SARVAM_PACE);
    const envTemp = Number(process.env.SARVAM_TTS_TEMPERATURE);
    const pace = Number.isFinite(envPace) ? envPace : voice.delivery.pace;
    const temperature = Number.isFinite(envTemp) ? envTemp : voice.delivery.temperature;
    const preferredRate = Number(process.env.SARVAM_SAMPLE_RATE || 24000);
    const lang = languageCode || process.env.SARVAM_LANGUAGE || "en-IN";

    // Prefer 24kHz (stable + natural). Retry lower rates if needed.
    const rates = Array.from(
      new Set([
        Number.isFinite(preferredRate) ? preferredRate : 24000,
        24000,
        22050,
        16000,
      ])
    );

    let lastError: unknown;
    for (const sampleRate of rates) {
      try {
        const audio = await sarvamSpeak({
          apiKey,
          text,
          speaker: voice.id,
          languageCode: lang,
          model,
          pace,
          temperature,
          sampleRate,
        });
        return NextResponse.json({
          source: "sarvam",
          model,
          speaker: voice.id,
          gender: voice.gender,
          pace,
          temperature,
          sampleRate,
          audioBase64: audio,
          mimeType: "audio/wav",
        });
      } catch (err) {
        lastError = err;
      }
    }

    return NextResponse.json({
      source: "browser",
      fallback: "speechSynthesis",
      gender: voice.gender,
      speaker: voice.id,
      warning: lastError instanceof Error ? lastError.message : "Sarvam TTS failed",
    });
  } catch {
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
