import type { CheckIssue, CheckIssueType } from "@/types/ai";
import type { NextRequest } from "next/server";

import { localIssues } from "@/lib/ai/glavred";
import { consumeCheck } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LANGUAGE_TOOL_URL = "https://api.languagetool.org/v2/check";
const MAX_TEXT_LENGTH = 5000;
const TIMEOUT_MS = 9000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_LIMIT = 200;

interface LanguageToolMatch {
  offset: number;
  length: number;
  message: string;
  rule?: { id?: string; issueType?: string };
  replacements?: Array<{ value: string }>;
}

function toIssueType(issueType: string | undefined, message: string): CheckIssueType {
  switch (issueType) {
    case "misspelling":
      return "spelling";
    case "typographical":
    case "typography":
    case "whitespace":
    case "casing":
    case "formatting":
      return "typography";
    case "grammar":
    case "duplication":
      return "grammar";
    case "style":
      return "style";
    case "punctuation":
      return "punctuation";
    default:
      break;
  }

  const lower = message.toLowerCase();
  if (lower.includes("орфограф") || lower.includes("опечат")) return "spelling";
  if (lower.includes("пунктуац") || lower.includes("запят")) return "punctuation";
  if (lower.includes("грамматик") || lower.includes("падеж") || lower.includes("согласов")) {
    return "grammar";
  }
  return "other";
}

const cache = new Map<string, { expiresAt: number; issues: CheckIssue[] }>();

function cacheKey(text: string): string {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return `${text.length}:${hash}`;
}

function readCache(text: string): CheckIssue[] | null {
  const entry = cache.get(cacheKey(text));
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(cacheKey(text));
    return null;
  }
  return entry.issues;
}

function writeCache(text: string, issues: CheckIssue[]): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(cacheKey(text), { expiresAt: Date.now() + CACHE_TTL_MS, issues });
}

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest): Promise<Response> {
  const limit = consumeCheck(clientKey(request));

  if (!limit.allowed) {
    return Response.json(
      {
        error: "rate_limit",
        retryAfterSeconds: limit.retryAfterSeconds,
        remaining: 0,
        limit: limit.limit,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const text = typeof payload === "object" && payload !== null ? (payload as { text?: unknown }).text : "";
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ matches: [], source: "engine", remaining: limit.remaining });
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: "too_large", remaining: limit.remaining, limit: limit.limit },
      { status: 413 },
    );
  }

  const cached = readCache(text);
  if (cached) {
    return Response.json({ matches: cached, source: "cache", remaining: limit.remaining });
  }

  try {
    const response = await fetch(LANGUAGE_TOOL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text, language: "ru-RU" }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`upstream ${response.status}`);
    }

    const data = (await response.json()) as { matches?: LanguageToolMatch[] };

    const issues: CheckIssue[] = (data.matches ?? []).slice(0, 60).map((match) => ({
      offset: match.offset,
      length: match.length,
      message: match.message,
      rule: match.rule?.id ?? "",
      issueType: toIssueType(match.rule?.issueType, match.message),
      replacements: (match.replacements ?? []).slice(0, 3).map((item) => item.value),
    }));

    writeCache(text, issues);

    return Response.json({ matches: issues, source: "engine", remaining: limit.remaining });
  } catch {
    const fallback: CheckIssue[] = localIssues(text).map((issue) => ({
      offset: issue.offset,
      length: issue.length,
      message: issue.message,
      rule: issue.rule,
      issueType: "style",
      replacements: issue.replacements,
    }));

    return Response.json({ matches: fallback, source: "local", remaining: limit.remaining });
  }
}
