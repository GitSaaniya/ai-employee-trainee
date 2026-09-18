import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mint a Gladia live WebSocket URL for the browser.
 * API key never leaves the server.
 */
export async function POST() {
  const apiKey = process.env.GLADIA_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GLADIA_API_KEY not configured", configured: false },
      { status: 503 }
    );
  }

  try {
    const res = await fetch("https://api.gladia.io/v2/live", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gladia-key": apiKey,
      },
      body: JSON.stringify({
        model: "solaria-1",
        encoding: "wav/pcm",
        sample_rate: 16000,
        bit_depth: 16,
        channels: 1,
        language_config: {
          languages: ["en"],
          code_switching: false,
        },
        messages_config: {
          receive_partial_transcripts: true,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Gladia live init failed: ${res.status} ${text}` },
        { status: 502 }
      );
    }

    const payload = (await res.json()) as { id?: string; url?: string };
    if (!payload.url) {
      return NextResponse.json({ error: "Gladia live missing url" }, { status: 502 });
    }

    return NextResponse.json({
      configured: true,
      id: payload.id,
      url: payload.url,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start live STT" },
      { status: 500 }
    );
  }
}
