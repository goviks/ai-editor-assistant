import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LANGUAGE_TOOL_URL = "https://api.languagetool.org/v2/check";
const MAX_TEXT_LENGTH = 5000;
const TIMEOUT_MS = 9000;

interface LanguageToolMatch {
  offset: number;
  length: number;
  message: string;
  rule?: { id?: string };
  replacements?: Array<{ value: string }>;
}

export async function POST(request: NextRequest): Promise<Response> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const text = typeof payload === "object" && payload !== null ? (payload as { text?: unknown }).text : "";
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ matches: [] });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  try {
    const response = await fetch(LANGUAGE_TOOL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text, language: "ru-RU" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return Response.json({ error: "upstream", status: response.status }, { status: 502 });
    }

    const data = (await response.json()) as { matches?: LanguageToolMatch[] };

    const matches = (data.matches ?? []).slice(0, 60).map((match) => ({
      offset: match.offset,
      length: match.length,
      message: match.message,
      rule: match.rule?.id ?? "",
      replacements: (match.replacements ?? []).slice(0, 3).map((item) => item.value),
    }));

    return Response.json({ matches });
  } catch {
    return Response.json({ error: "network" }, { status: 503 });
  }
}
