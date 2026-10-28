import { WATER_WORDS } from "./glavred";

const VOWELS = /[аеёиоуыэюя]/giu;

export interface TextMetrics {
  chars: number;
  charsNoSpaces: number;
  words: number;
  sentences: number;
  avgSentenceLength: number;
  waterPercent: number;
  spamPercent: number;
  readability: number;
  readabilityLabel: string;
  readingSeconds: number;
  topWords: Array<{ word: string; count: number }>;
}

function countSyllables(word: string): number {
  const matches = word.match(VOWELS);
  return Math.max(1, matches ? matches.length : 1);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?…]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^а-яёa-z]/gu, "");
}

export function analyzeText(text: string): TextMetrics {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const sentences = splitSentences(trimmed);
  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = words.length;

  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllables = wordCount ? syllables / wordCount : 0;

  const readability = wordCount
    ? Math.max(
        1,
        Math.min(100, Math.round(100 - avgSentenceLength * 3.2 - (avgSyllables - 1) * 6)),
      )
    : 0;

  const waterSet = new Set(WATER_WORDS.map((word) => word.toLowerCase()));
  const waterCount = words.filter((word) => waterSet.has(normalizeWord(word))).length;
  const waterPercent = wordCount ? Math.round((waterCount / wordCount) * 100) : 0;

  const normalized = words.map(normalizeWord).filter((word) => word.length > 3);
  const frequency = new Map<string, number>();
  for (const word of normalized) {
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }
  const topWords = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word, count]) => ({ word, count }));

  const topCount = topWords[0]?.count ?? 0;
  const spamPercent = wordCount
    ? Math.max(0, Math.round(((topCount - 1) / wordCount) * 100))
    : 0;

  const label =
    readability >= 70
      ? "легко"
      : readability >= 50
        ? "средне"
        : readability >= 35
          ? "сложно"
          : "очень сложно";

  return {
    chars: text.length,
    charsNoSpaces: text.replace(/\s/g, "").length,
    words: wordCount,
    sentences: sentences.length,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    waterPercent,
    spamPercent,
    readability,
    readabilityLabel: label,
    readingSeconds: Math.max(1, Math.round((wordCount / 200) * 60)),
    topWords,
  };
}

export function formatReadingTime(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} мин`;
}
