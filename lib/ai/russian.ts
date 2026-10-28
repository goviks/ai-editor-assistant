import { analyzeText } from "./analysis";
import { cleanWithRules, compressWithRules, WATER_WORDS } from "./glavred";
import { SYNONYMS } from "./synonyms";

const WORD_END = "(?![а-яёa-z])";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordPattern(word: string): RegExp {
  return new RegExp(`(?<![а-яёa-z])${escapeRegExp(word)}${WORD_END}`, "giu");
}

function phrasePattern(phrase: string): RegExp {
  return new RegExp(`(?<![а-яёa-z])${escapeRegExp(phrase)}${WORD_END}`, "giu");
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const ORTHOGRAPHY: Array<[string, string]> = [
  ["жы", "жи"],
  ["шы", "ши"],
  ["чя", "ча"],
  ["щя", "ща"],
  ["чю", "чу"],
  ["щю", "щу"],
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
  ["ихний", "их"],
  ["ложить", "класть"],
];

const PHRASE_FIXES: Array<[string, string]> = [
  ["надо чтобы", "нужно, чтобы"],
  ["что бы", "чтобы"],
  ["в течении", "в течение"],
  ["в продолжении", "в продолжение"],
  ["не смотря на", "несмотря на"],
  ["в место", "вместо"],
  ["как то", "как-то"],
  ["т.е.", "то есть"],
  ["т.д.", "и так далее"],
  ["т.п.", "и тому подобное"],
  ["в виду того что", "ввиду того что"],
  ["тем что", "тем, что"],
  ["то что", "то, что"],
];

const COLLOQUIAL: Array<[string, string]> = [
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
  ["пацаны", "коллеги"],
  ["тачка", "автомобиль"],
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
  "собственно",
  "в общем-то",
  "так сказать",
];

const INTRODUCTORY: string[] = [
  "конечно",
  "разумеется",
  "безусловно",
  "наверное",
  "вероятно",
  "возможно",
  "кажется",
  "по-моему",
  "во-первых",
  "во-вторых",
  "наконец",
  "например",
  "кстати",
  "итак",
  "следовательно",
  "значит",
  "словом",
  "к сожалению",
  "к счастью",
  "по сути",
  "в общем",
  "как известно",
  "другими словами",
  "иначе говоря",
];

const VERBOSE: Array<[string, string]> = [
  ["для того чтобы", "чтобы"],
  ["в связи с тем что", "потому что"],
  ["в связи с тем, что", "потому что"],
  ["по причине того что", "потому что"],
  ["на данный момент", "сейчас"],
  ["в настоящий момент", "сейчас"],
  ["в настоящее время", "сейчас"],
  ["на сегодняшний день", "сегодня"],
  ["большое количество", "много"],
  ["в целях", "для"],
  ["осуществляет", "делает"],
  ["осуществляют", "делают"],
  ["осуществляем", "делаем"],
  ["осуществляете", "делаете"],
  ["производит", "делает"],
  ["в том числе", "включая"],
  ["несмотря на тот факт что", "хотя"],
  ["в конечном итоге", "в итоге"],
];

const PLEONASMS: Array<[string, string]> = [
  ["памятный сувенир", "сувенир"],
  ["свободная вакансия", "вакансия"],
  ["главный приоритет", "приоритет"],
  ["совместное сотрудничество", "сотрудничество"],
  ["очень огромный", "огромный"],
  ["самый оптимальный", "оптимальный"],
  ["первый дебют", "дебют"],
  ["предварительное планирование", "планирование"],
];

const EDGE_STOP_WORDS = new Set([
  "и", "а", "но", "что", "чтобы", "в", "во", "на", "с", "со", "к", "ко",
  "по", "для", "из", "от", "до", "же", "ли", "не", "ни", "или", "за", "при",
]);

const WEAK_ADJECTIVES: string[] = [
  "большой",
  "огромный",
  "маленький",
  "определённый",
  "следующий",
  "данный",
  "текущий",
  "различный",
  "некоторый",
  "очередной",
];

function applyPairs(text: string, pairs: Array<[string, string]>, phraseMode = true): string {
  let result = text;
  for (const [from, to] of pairs) {
    result = result.replace(phraseMode ? phrasePattern(from) : wordPattern(from), to);
  }
  return result;
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
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanPunctuation(text: string): string {
  return text
    .replace(/,\s*,/g, ",")
    .replace(/,\s*([.!?…])/g, "$1")
    .replace(/([.!?…])\s*,/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/^[\s,;:—–-]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeQuotes(text: string): string {
  return text.replace(/"([^"\n]{1,120})"/g, "«$1»");
}

function normalizeDashes(text: string): string {
  return text.replace(/\s+[-–—]\s+/g, " — ");
}

function addCommas(text: string): string {
  let result = text;

  result = result.replace(
    /([а-яёa-z])\s+(чтобы|который|которая|которое|которые|потому что|так как|хотя|если|когда)(?![а-яёa-z])/giu,
    "$1, $2",
  );

  for (const word of INTRODUCTORY) {
    const pattern = new RegExp(
      `(?<![а-яёa-z,;:—(])${escapeRegExp(word)}(?![а-яёa-z])(?!\\s*[,.;:!?—])`,
      "giu",
    );
    result = result.replace(pattern, (match) => `${match},`);
  }

  return cleanPunctuation(result);
}

function capitalizeSentences(text: string): string {
  return text.replace(/(^|[.!?…]\s+)([a-zа-яё])/g, (_match, prefix: string, letter: string) => {
    return prefix + letter.toUpperCase();
  });
}

function finalize(text: string): string {
  const trimmed = cleanPunctuation(text).replace(/[,;:—–\-\s]+$/, "");
  if (!trimmed) return trimmed;
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function removePhrases(text: string, phrases: string[]): string {
  let result = text;
  for (const phrase of phrases) {
    result = result.replace(phrasePattern(phrase), " ");
  }
  return result.replace(/\s{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1");
}

function dedupeWords(text: string): string {
  return text.replace(/(?<![а-яёa-z])([а-яёa-z]+)(\s+\1(?![а-яёa-z]))+/giu, "$1");
}

function reduceWater(text: string, targetPercent: number): string {
  let current = text;
  const waterWords = [...FILLERS, ...INTRODUCTORY, ...WATER_WORDS];

  for (let i = 0; i < 6; i += 1) {
    if (analyzeText(current).waterPercent <= targetPercent) break;
    const next = tidy(removePhrases(current, waterWords));
    if (next === current) break;
    current = next;
  }

  return current;
}

function reduceRepetition(text: string, targetPercent: number): string {
  let current = text;

  for (let i = 0; i < 6; i += 1) {
    const metrics = analyzeText(current);
    if (metrics.spamPercent <= targetPercent) break;

    const top = metrics.topWords[0];
    if (!top || top.count < 2) break;

    const synonym = SYNONYMS[top.word];
    if (synonym) {
      let seen = 0;
      const pattern = new RegExp(`(?<![а-яёa-z])${escapeRegExp(top.word)}(?![а-яёa-z])`, "giu");
      current = current.replace(pattern, (match) => {
        seen += 1;
        return seen === 1 ? match : synonym;
      });
      continue;
    }

    const sentences = splitSentences(current);
    if (sentences.length < 2) break;

    const redundant = sentences.map((sentence) => sentence.toLowerCase().includes(top.word)).lastIndexOf(true);
    if (redundant <= 0) break;

    sentences.splice(redundant, 1);
    current = sentences.join(" ");
  }

  return current;
}

function splitLongSentences(text: string): string {
  const sentences = splitSentences(text);
  const result: string[] = [];

  for (const sentence of sentences) {
    const core = sentence.replace(/[.!?…]+$/, "");
    const count = core.split(/\s+/).filter(Boolean).length;
    const comma = core.indexOf(", ");

    if (count <= 9 || comma === -1) {
      result.push(sentence);
      continue;
    }

    const first = core.slice(0, comma).trim();
    const second = core.slice(comma + 2).trim();

    if (first.split(/\s+/).length < 3 || second.split(/\s+/).length < 3) {
      result.push(sentence);
      continue;
    }

    result.push(`${first}.`, `${second.charAt(0).toUpperCase()}${second.slice(1)}`);
  }

  return result.join(" ");
}

function raiseReadability(text: string, target: number): string {
  let current = text;

  for (let i = 0; i < 4; i += 1) {
    if (analyzeText(current).readability > target) break;
    const next = splitLongSentences(current);
    if (next === current) break;
    current = next;
  }

  return current;
}

function enforceTargets(
  text: string,
  waterTarget: number,
  spamTarget: number,
  readabilityTarget: number,
): string {
  let result = text;
  result = reduceWater(result, waterTarget);
  result = reduceRepetition(result, spamTarget);
  if (readabilityTarget > 0) result = raiseReadability(result, readabilityTarget);
  return finalize(capitalizeSentences(tidy(result)));
}

export function fixOrthography(text: string): string {
  let result = text;
  result = applyPairs(result, ORTHOGRAPHY, false);
  result = applyPairs(result, PHRASE_FIXES);
  return result;
}

export function improveText(text: string): string {
  let result = tidy(text);
  result = fixOrthography(result);
  result = applyPairs(result, COLLOQUIAL, false);
  result = applyPairs(result, VERBOSE);
  result = applyPairs(result, PLEONASMS);
  result = cleanWithRules(result);
  result = removePhrases(result, FILLERS);
  result = dedupeWords(result);
  result = normalizeQuotes(result);
  result = normalizeDashes(result);
  result = addCommas(result);
  return enforceTargets(result, 10, 10, 70);
}

function dropIntroductory(text: string): string {
  return removePhrases(text, INTRODUCTORY);
}

function dropWeakAdjectives(text: string): string {
  let result = text;
  for (const adjective of WEAK_ADJECTIVES) {
    result = result.replace(
      new RegExp(`(?<![а-яёa-z])${escapeRegExp(adjective)}\\s+(?=[а-яё])`, "giu"),
      "",
    );
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

function dropTrailingClauses(text: string, targetWords: number, minWords: number): string {
  const clauses = text.split(/,\s+/);

  while (clauses.length > 1 && words(clauses.join(", ")) > targetWords) {
    const next = clauses.slice(0, -1);
    if (words(next.join(", ")) < minWords) break;
    clauses.pop();
  }

  return clauses.join(", ");
}

function trimTail(text: string, minWords: number): string {
  const parts = text.replace(/[.!?…]+$/, "").split(/\s+/).filter(Boolean);

  if (parts.length > minWords) parts.pop();

  while (parts.length > 2) {
    const last = parts[parts.length - 1]?.toLowerCase().replace(/[^\p{L}]/gu, "") ?? "";
    if (!EDGE_STOP_WORDS.has(last)) break;
    parts.pop();
  }

  return parts.join(" ");
}

export function shortenText(text: string): string {
  const sourceWords = words(text);
  const targetWords = Math.max(3, Math.ceil(sourceWords * 0.75));
  const minWords = Math.max(3, Math.ceil(sourceWords * 0.4));

  let result = improveText(text);
  result = applyPairs(result, VERBOSE);
  result = compressWithRules(result);
  result = dropIntroductory(result);
  result = dropWeakAdjectives(result);
  result = tidy(result);

  const sentences = splitSentences(result);

  if (sentences.length >= 3) {
    for (let keep = sentences.length - 1; keep >= 2; keep -= 1) {
      const candidate = sentences.slice(0, keep).join(" ");
      if (words(candidate) <= targetWords) {
        if (words(candidate) >= minWords) result = candidate;
        break;
      }
      result = candidate;
    }
  } else {
    result = dropTrailingClauses(result, targetWords, minWords);
  }

  if (words(result) >= sourceWords) {
    result = dropTrailingClauses(result, Math.ceil(sourceWords * 0.7), minWords);
  }

  if (words(result) >= sourceWords) {
    result = trimTail(result, minWords);
  }

  return enforceTargets(result, 5, 5, 0);
}
