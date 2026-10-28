import type { CheckIssue, CheckIssueType } from "@/types/ai";

const LANGUAGE_TOOL_URL =
  process.env.LANGUAGETOOL_URL ?? "https://api.languagetool.org/v2/check";
const TIMEOUT_MS = 9000;
const CHUNK_SIZE = 5000;
const MAX_CONCURRENT_CHUNKS = 3;

interface LanguageToolMatch {
  offset: number;
  length: number;
  message: string;
  rule?: { id?: string; issueType?: string };
  replacements?: Array<{ value: string }>;
}

export function toIssueType(issueType: string | undefined, message: string): CheckIssueType {
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

export async function checkWithLanguageTool(text: string): Promise<CheckIssue[] | null> {
  try {
    const chunks: Array<{ start: number; text: string }> = [];
    for (let start = 0; start < text.length; ) {
      let end = Math.min(start + CHUNK_SIZE, text.length);
      if (end < text.length) {
        const boundary = text.lastIndexOf(" ", end);
        if (boundary > start + Math.floor(CHUNK_SIZE / 2)) end = boundary + 1;
      }

      chunks.push({ start, text: text.slice(start, end) });
      start = end;
    }

    const results: CheckIssue[][] = Array.from({ length: chunks.length }, () => []);
    let nextChunk = 0;
    let failed = false;

    const worker = async () => {
      while (!failed) {
        const index = nextChunk;
        nextChunk += 1;
        const chunk = chunks[index];
        if (!chunk) return;

        try {
          const response = await fetch(LANGUAGE_TOOL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ text: chunk.text, language: "ru-RU" }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
          if (!response.ok) {
            failed = true;
            return;
          }

          const data = (await response.json()) as { matches?: LanguageToolMatch[] };
          results[index] = (data.matches ?? []).slice(0, 200).map((match) => ({
            offset: chunk.start + match.offset,
            length: match.length,
            message: match.message,
            rule: match.rule?.id ?? "",
            issueType: toIssueType(match.rule?.issueType, match.message),
            replacements: (match.replacements ?? []).slice(0, 3).map((item) => item.value),
          }));
        } catch {
          failed = true;
          return;
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENT_CHUNKS, chunks.length) }, () => worker()),
    );
    if (failed) return null;
    return results.flat().slice(0, 200);
  } catch {
    return null;
  }
}
