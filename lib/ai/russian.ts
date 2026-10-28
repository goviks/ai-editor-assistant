import { analyzeText } from "./analysis.ts";

const ORTHOGRAPHY: Array<[string, string]> = [
  ["вообщем", "в общем"],
  ["вобщем", "в общем"],
  ["незнаю", "не знаю"],
  ["немогу", "не могу"],
  ["нехочу", "не хочу"],
  ["небуду", "не буду"],
  ["небыло", "не было"],
  ["небыл", "не был"],
  ["извени", "извини"],
  ["зделать", "сделать"],
  ["зделал", "сделал"],
  ["прийдёт", "придёт"],
  ["прийдет", "придёт"],
];

const SAFE_SHORTENING: Array<[string, string]> = [
  ["для того, чтобы", "чтобы"],
  ["для того чтобы", "чтобы"],
  ["в конечном итоге", "в итоге"],
  ["совместное сотрудничество", "сотрудничество"],
  ["свободная вакансия", "вакансия"],
  ["памятный сувенир", "сувенир"],
  ["предварительное планирование", "планирование"],
  ["первый дебют", "дебют"],
];

const SUBORDINATING_CONJUNCTIONS = [
  "потому что",
  "так как",
  "несмотря на то что",
  "в то время как",
  "который",
  "которая",
  "которое",
  "которые",
  "чтобы",
  "если",
  "когда",
  "поскольку",
  "хотя",
  "будто",
  "словно",
  "чем",
  "что",
];

const INTRODUCTORY_WORDS = [
  "безусловно",
  "вероятно",
  "возможно",
  "во-первых",
  "во-вторых",
  "кажется",
  "к сожалению",
  "к счастью",
  "конечно",
  "наверное",
  "например",
  "по-моему",
  "разумеется",
  "следовательно",
];

function preserveCase(source: string, replacement: string): string {
  if (source === source.toLocaleUpperCase("ru-RU")) {
    return replacement.toLocaleUpperCase("ru-RU");
  }
  if (source[0] === source[0]?.toLocaleUpperCase("ru-RU")) {
    return replacement[0]!.toLocaleUpperCase("ru-RU") + replacement.slice(1);
  }
  return replacement;
}

function applyWordPairs(text: string, pairs: Array<[string, string]>): string {
  let result = text;
  for (const [from, to] of pairs) {
    const pattern = new RegExp(`(?<![а-яёa-z])${from}(?![а-яёa-z])`, "giu");
    result = result.replace(pattern, (match) => preserveCase(match, to));
  }
  return result;
}

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:!?…])/g, "$1")
    .replace(/([,;:])(?=[^\s\d])/g, "$1 ")
    .replace(/([.!?…])(?=[^\s.!?…])/g, "$1 ")
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*([.!?…])/g, "$1")
    .replace(/([.!?…])\s*,/g, "$1");
}

function addSubordinateCommas(text: string): string {
  const conjunctions = SUBORDINATING_CONJUNCTIONS
    .map((conjunction) => conjunction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const pattern = new RegExp(
    `([а-яёa-z])\\s+(${conjunctions})(?![а-яёa-z])`,
    "giu",
  );
  return text.replace(pattern, (match, previous: string, conjunction: string, offset: number) => {
    if (text[offset + previous.length] === ",") return match;
    if (
      conjunction.toLocaleLowerCase("ru-RU") === "чтобы" &&
      /(?<![а-яёa-z])для\s+того$/iu.test(
        text.slice(Math.max(0, offset - 12), offset + previous.length),
      )
    ) {
      return match;
    }
    return `${previous}, ${conjunction}`;
  });
}

function addIntroductoryCommas(text: string): string {
  let result = text;
  for (const word of INTRODUCTORY_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(^|[.!?…]\\s+|\\n\\s*)(${escaped})(?![а-яёa-z,;:—])`,
      "giu",
    );
    result = result.replace(pattern, "$1$2,");
  }
  return result;
}

function normalizeQuotes(text: string): string {
  return text.replace(/"([^"\n]{1,120})"/g, "«$1»");
}

function capitalizeSentences(text: string): string {
  return text.replace(
    /(^|[.!?…]\s+|\n+)([а-яё])/giu,
    (_match, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase("ru-RU"),
  );
}

function addFinalPunctuation(text: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed) return trimmed;
  return /[.!?…»”)]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function fixOrthography(text: string): string {
  let result = applyWordPairs(text, ORTHOGRAPHY);

  result = result.replace(/([жш])ы/giu, (match, consonant: string) => {
    const vowel = match.endsWith("Ы") ? "И" : "и";
    return consonant + vowel;
  });
  result = result.replace(/([чщ])([яю])/giu, (match, consonant: string, vowel: string) => {
    const corrected = vowel.toLocaleLowerCase("ru-RU") === "я" ? "а" : "у";
    return consonant + preserveCase(vowel, corrected);
  });
  result = result.replace(
    /(?<![а-яёa-z])(надо|нужно)\s+чтобы(?![а-яёa-z])/giu,
    (match) => match.replace(/\s+/, ", "),
  );
  result = result.replace(
    /(?<![а-яёa-z])(то|тем)\s+что(?![а-яёa-z])/giu,
    (match) => match.replace(/\s+/, ", "),
  );

  return result;
}

export function improveText(text: string): string {
  let result = fixOrthography(text);
  result = addSubordinateCommas(result);
  result = addIntroductoryCommas(result);
  result = normalizeQuotes(result);
  result = tidy(result);
  result = capitalizeSentences(result);
  result = addFinalPunctuation(result);
  return result;
}

export function shortenText(text: string): string {
  let result = improveText(text);
  result = applyWordPairs(result, SAFE_SHORTENING);
  result = result.replace(/(?<![а-яёa-z])э{2,}|(?<![а-яёa-z])эм+(?![а-яёa-z])/giu, "");
  result = tidy(result);
  result = capitalizeSentences(result);
  result = addFinalPunctuation(result);

  const originalMetrics = analyzeText(text);
  const shortenedMetrics = analyzeText(result);
  return shortenedMetrics.words <= originalMetrics.words ? result : improveText(text);
}
