import type { AssistMode } from "@/types/ai";

import { improveText, shortenText } from "./russian";

const FIRST_TOKEN_DELAY_MS = 700;
const TOKEN_DELAY_MS = 35;

export { improveText, shortenText };

export function transformText(text: string, mode: AssistMode): string {
  const source = text.trim();
  if (!source) return "";

  const result = mode === "shorten" ? shortenText(source) : improveText(source);
  return result.trim() || source;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function streamMockCompletion({
  text,
  mode,
  signal,
  onDelta,
}: {
  text: string;
  mode: AssistMode;
  signal: AbortSignal;
  onDelta: (chunk: string) => void;
}): Promise<void> {
  await sleep(FIRST_TOKEN_DELAY_MS, signal);

  const result = transformText(text, mode);
  const tokens = result.split(/(\s+)/);

  for (const token of tokens) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    onDelta(token);
    if (token.trim().length > 0) {
      await sleep(TOKEN_DELAY_MS, signal);
    }
  }
}
