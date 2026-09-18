const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** llama-3.3-70b-versatile was shut down for free/dev tiers (Aug 2026). */
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export function getGroqApiKey() {
  return process.env.GROQ_API_KEY?.trim() || "";
}

export function getGroqModel() {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
}

function extractJsonText(content: string): string {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export async function groqChatJson<T>(params: {
  system: string;
  user: string;
  temperature?: number;
  /** Optional JSON Schema for Structured Outputs (preferred on gpt-oss). */
  jsonSchema?: Record<string, unknown>;
  schemaName?: string;
}): Promise<T> {
  const key = getGroqApiKey();
  if (!key) throw new Error("GROQ_API_KEY is not set");

  const responseFormat = params.jsonSchema
    ? {
        type: "json_schema" as const,
        json_schema: {
          name: params.schemaName ?? "result",
          strict: true,
          schema: params.jsonSchema,
        },
      }
    : ({ type: "json_object" } as const);

  async function call(format: typeof responseFormat | { type: "json_object" }) {
    return fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getGroqModel(),
        temperature: params.temperature ?? 0.4,
        response_format: format,
        messages: [
          {
            role: "system",
            content: `${params.system}\n\nYou must return valid JSON only. No markdown fences.`,
          },
          { role: "user", content: params.user },
        ],
      }),
    });
  }

  let res = await call(responseFormat);

  // Some models reject json_schema — fall back to json_object mode
  if (!res.ok && params.jsonSchema) {
    const errText = await res.text();
    if (/json_schema|response_format|unsupported/i.test(errText)) {
      res = await call({ type: "json_object" });
    } else {
      throw new Error(`Groq error: ${res.status} ${errText}`);
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq error: ${res.status} ${text}`);
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty Groq response");

  try {
    return JSON.parse(extractJsonText(content)) as T;
  } catch {
    throw new Error(`Groq returned non-JSON content: ${content.slice(0, 200)}`);
  }
}
