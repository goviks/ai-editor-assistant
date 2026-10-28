import type { AssistMode } from "@/types/ai";

const FIRST_TOKEN_DELAY_MS = 700;
const TOKEN_DELAY_MS = 35;

const LITERARY: Array<[string, string]> = [
  ["привет", "Здравствуйте"],
  ["здравствуй", "Здравствуйте"],
  ["надо", "нужно"],
  ["чё", "что"],
  ["щас", "сейчас"],
  ["скажи", "скажите"],
  ["хочу", "хотел бы"],
  ["думаю", "полагаю"],
  ["ребята", "коллеги"],
  ["классно", "хорошо"],
  ["клёво", "хорошо"],
  ["чуток", "немного"],
];

const FILLERS: string[] = [
  "ну",
  "вот",
  "типа",
  "как бы",
  "короче",
  "блин",
  "ээ",
  "эм",
  "значит",
  "собственно",
  "в общем-то",
];

const IMPROVE_FIXES: Array<[string, string]> = [
  ["надо чтобы", "нужно, чтобы"],
  ["что бы", "чтобы"],
  ["в течении", "в течение"],
  ["не смотря на", "несмотря на"],
  ["в место", "вместо"],
  ["вобщем", "в общем"],
  ["как то", "как-то"],
  ["т.е.", "то есть"],
  ["и т.д.", "и так далее"],
];

const VERBOSE: Array<[string, string]> = [
  ["для того чтобы", "чтобы"],
  ["в связи с тем что", "потому что"],
  ["на данный момент", "сейчас"],
  ["в настоящий момент", "сейчас"],
  ["в настоящее время", "сейчас"],
  ["большое количество", "много"],
  ["в целях", "для"],
  ["осуществляет", "делает"],
  ["производит", "делает"],
  ["по причине", "из-за"],
  ["в том числе", "включая"],
];

const SHORTEN_FILLERS: string[] = [
  "очень",
  "просто",
  "вообще",
  "на самом деле",
  "в принципе",
  "по сути",
  "стоит отметить",
  "нужно отметить",
  "можно сказать",
  "так сказать",
  "кстати",
  "конечно",
];

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phrasePattern(phrase: string): RegExp {
  return new RegExp(`(?<![а-яёa-z])${escapeRegExp(phrase)}(?![а-яёa-z])`, "giu");
}

function applyPhrases(text: string, pairs: Array<[string, string]>): string {
  let result = text;
  for (const [from, to] of pairs) {
    result = result.replace(phrasePattern(from), to);
  }
  return result;
}

function removePhrases(text: string, phrases: string[]): string {
  let result = text;
  for (const phrase of phrases) {
    result = result.replace(phrasePattern(phrase), " ");
  }
  return result.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1");
}

function tidy(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=[^\s\d])/g, "$1 ")
    .replace(/([.!?])(?=[^\s.!?])/g, "$1 ")
    .replace(/\.{3,}/g, "…")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function addCommas(text: string): string {
  return text
    .replace(/([а-яёa-z])\s+(чтобы|который|которая|которое|которые)(?![а-яёa-z])/giu, "$1, $2")
    .replace(/([а-яёa-z])\s+(если|когда)(?![а-яёa-z])/giu, "$1, $2");
}

function dedupeWords(text: string): string {
  return text.replace(/(?<![а-яёa-z])([а-яёa-z]+)(\s+\1(?![а-яёa-z]))+/giu, "$1");
}

function capitalizeSentences(text: string): string {
  return text.replace(/(^|[.!?…]\s+)([a-zа-яё])/g, (_match, prefix: string, letter: string) => {
    return prefix + letter.toUpperCase();
  });
}

function finalize(text: string): string {
  const trimmed = text.trim().replace(/\s+([,.;:!?])/g, "$1");
  if (!trimmed) return trimmed;
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function improveText(text: string): string {
  let result = tidy(text);
  result = applyPhrases(result, IMPROVE_FIXES);
  result = applyPhrases(result, LITERARY);
  result = removePhrases(result, FILLERS);
  result = dedupeWords(result);
  result = addCommas(result);
  return finalize(capitalizeSentences(result));
}

export function shortenText(text: string): string {
  const sourceWords = words(text);

  let result = improveText(text);
  result = applyPhrases(result, VERBOSE);
  result = removePhrases(result, SHORTEN_FILLERS);
  result = tidy(result);

  const sentences = splitSentences(result);
  while (words(result) >= sourceWords && sentences.length > 1) {
    sentences.pop();
    result = finalize(capitalizeSentences(sentences.join(" ")));
  }

  if (words(result) >= sourceWords) {
    const parts = result.split(/\s+/).filter(Boolean);
    const keep = Math.max(3, Math.floor(parts.length * 0.7));
    result = finalize(capitalizeSentences(parts.slice(0, keep).join(" ")));
  }

  return finalize(capitalizeSentences(result));
}

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
