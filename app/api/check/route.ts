import { createHash } from "node:crypto";
import type { CheckIssue } from "@/types/ai";
import type { NextRequest } from "next/server";

import { localIssues } from "@/lib/ai/glavred";
import { optionsResponse, withPagesCors } from "@/lib/server/cors";
import { checkWithLanguageTool } from "@/lib/server/languagetool";
import { consumeCheck } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LENGTH = 50000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_LIMIT = 200;

const cache = new Map<string, { expiresAt: number; issues: CheckIssue[] }>();

function cacheKey(text: string): string {
  return createHash("sha256").update(text).digest("hex");
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
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return withPagesCors(request, Response.json({ error: "bad_request" }, { status: 400 }));
  }

  const text = typeof payload === "object" && payload !== null ? (payload as { text?: unknown }).text : "";
  if (typeof text !== "string" || !text.trim()) {
    return withPagesCors(request, Response.json({ matches: [], source: "engine" }));
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return withPagesCors(
      request,
      Response.json({ error: "too_large", limit: MAX_TEXT_LENGTH }, { status: 413 }),
    );
  }

  const cached = readCache(text);
  if (cached) {
    return withPagesCors(request, Response.json({ matches: cached, source: "cache" }));
  }

  const limit = consumeCheck(clientKey(request));
  if (!limit.allowed) {
    return withPagesCors(
      request,
      Response.json(
        {
          error: "rate_limit",
          retryAfterSeconds: limit.retryAfterSeconds,
          remaining: 0,
          limit: limit.limit,
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      ),
    );
  }

  const issues = await checkWithLanguageTool(text);
  if (issues) {
    writeCache(text, issues);
    return withPagesCors(
      request,
      Response.json({ matches: issues, source: "engine", remaining: limit.remaining }),
    );
  }

  const fallback: CheckIssue[] = localIssues(text).map((issue) => ({
    offset: issue.offset,
    length: issue.length,
    message: issue.message,
    rule: issue.rule,
    issueType: "style",
    replacements: issue.replacements,
  }));
  return withPagesCors(
    request,
    Response.json({ matches: fallback, source: "local", remaining: limit.remaining }),
  );
}

export function OPTIONS(request: NextRequest): Response {
  return optionsResponse(request);
}
