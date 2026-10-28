import type { AssistMode } from "@/types/ai";

const FIRST_TOKEN_DELAY_MS = 700;
const TOKEN_DELAY_MS = 35;

const FORMAL: Array<[RegExp, string]> = [
  [/(?<![а-яёa-z])привет(?![а-яёa-z])/giu, "Здравствуйте"],
  [/(?<![а-яёa-z])хочу(?![а-яёa-z])/giu, "хотел бы"],
  [/(?<![а-яёa-z])надо(?![а-яёa-z])/giu, "необходимо"],
  [/(?<![а-яёa-z])нужно(?![а-яёa-z])/giu, "необходимо"],
  [/(?<![а-яёa-z])скажи(?![а-яёa-z])/giu, "сообщите"],
  [/(?<![а-яёa-z])скажите(?![а-яёa-z])/giu, "сообщите"],
  [/(?<![а-яёa-z])сдвинуть(?![а-яёa-z])/giu, "перенести"],
  [/(?<![а-яёa-z])устраивают(?![а-яёa-z])/giu, "подходят"],
  [/(?<![а-яёa-z])почти(?![а-яёa-z])/giu, "практически"],
  [/(?<![а-яёa-z])ребята(?![а-яёa-z])/giu, "коллеги"],
  [/(?<![а-яёa-z])прикинь(?![а-яёa-z])/giu, "обратите внимание"],
];

const IMPROVE: Array<[RegExp, string]> = [
  [/(?<![а-яёa-z])надо чтобы(?![а-яёa-z])/giu, "нужно, чтобы"],
  [/(?<![а-яёa-z])что бы(?![а-яёa-z])/giu, "чтобы"],
  [/(?<![а-яёa-z])в течении(?![а-яёa-z])/giu, "в течение"],
  [/(?<![а-яёa-z])не смотря на(?![а-яёa-z])/giu, "несмотря на"],
  [/(?<![а-яёa-z])в место(?![а-яёa-z])/giu, "вместо"],
  [/(?<![а-яёa-z])вобщем(?![а-яёa-z])/giu, "в общем"],
  [/(?<![а-яёa-z])как то(?![а-яёa-z])/giu, "как-то"],
];

function tidy(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=[^\s\d])/g, "$1 ")
    .replace(/([.!?])(?=[^\s.!?])/g, "$1 ")
    .replace(/\.{3,}/g, "…")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
}

function capitalizeSentences(text: string): string {
  return text.replace(/(^|[.!?]\s+)([a-zа-яё])/g, (_match, prefix: string, letter: string) => {
    return prefix + letter.toUpperCase();
  });
}

function finalize(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

const STOP_WORDS = new Set([
  "и", "а", "но", "что", "чтобы", "в", "во", "на", "с", "со", "к", "ко",
  "по", "ты", "я", "мы", "он", "она", "это", "не", "за", "из", "для", "же", "ли",
]);

function applyImprovements(text: string): string {
  let result = text;
  for (const [pattern, replacement] of IMPROVE) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function improveText(text: string): string {
  return finalize(capitalizeSentences(applyImprovements(tidy(text))));
}

export function shortenText(text: string): string {
  const prepared = applyImprovements(tidy(text));
  const sentences = splitSentences(prepared);

  if (sentences.length <= 1) {
    const words = prepared.split(/\s+/);
    const cut = Math.max(6, Math.ceil(words.length * 0.6));

    if (cut >= words.length) return finalize(capitalizeSentences(prepared));

    const slice = words.slice(0, cut);
    while (slice.length > 3) {
      const last = slice[slice.length - 1]?.toLowerCase().replace(/[^\p{L}]/gu, "") ?? "";
      if (!STOP_WORDS.has(last)) break;
      slice.pop();
    }

    return `${finalize(capitalizeSentences(slice.join(" "))).replace(/[.…]$/, "")}…`;
  }

  const target = Math.max(1, Math.ceil(sentences.length * 0.6));
  return finalize(capitalizeSentences(sentences.slice(0, target).join(" ")));
}

export function formalizeText(text: string): string {
  let result = applyImprovements(tidy(text));
  for (const [pattern, replacement] of FORMAL) {
    result = result.replace(pattern, replacement);
  }
  return finalize(capitalizeSentences(result.replace(/\s*!+/g, ".")));
}

export function transformText(text: string, mode: AssistMode): string {
  const source = text.trim();
  if (!source) return "";

  const result =
    mode === "shorten"
      ? shortenText(source)
      : mode === "formalize"
        ? formalizeText(source)
        : improveText(source);

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
