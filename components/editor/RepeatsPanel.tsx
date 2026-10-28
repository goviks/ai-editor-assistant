"use client";

import { useMemo } from "react";

import { analyzeText } from "@/lib/ai/analysis";
import { findSynonym } from "@/lib/ai/synonyms";
import { useAssistantStore } from "@/lib/store/assistant-store";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function RepeatsPanel() {
  const documentText = useAssistantStore((state) => state.documentText);
  const setDocumentText = useAssistantStore((state) => state.setDocumentText);
  const pushHistory = useAssistantStore((state) => state.pushHistory);

  const repeats = useMemo(() => {
    const { topWords } = analyzeText(documentText);
    return topWords
      .filter((item) => item.count >= 2)
      .map((item) => ({ ...item, synonym: findSynonym(item.word) }))
      .filter((item): item is { word: string; count: number; synonym: string } => Boolean(item.synonym));
  }, [documentText]);

  if (repeats.length === 0) return null;

  const replaceRepeats = (word: string, synonym: string) => {
    const pattern = new RegExp(`(?<![а-яёa-z])${escapeRegExp(word)}(?![а-яёa-z])`, "giu");
    let seen = 0;

    const next = documentText.replace(pattern, (match: string, offset: number, source: string) => {
      seen += 1;
      if (seen === 1) return match;

      const before = source.slice(Math.max(0, offset - 2), offset);
      const sentenceStart = offset === 0 || /[.!?…]\s*$/.test(before);
      return sentenceStart ? synonym.charAt(0).toUpperCase() + synonym.slice(1) : synonym;
    });

    if (next === documentText) return;
    pushHistory("Замена повтора");
    setDocumentText(next);
  };

  return (
    <section aria-label="Повторы слов" className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <h2 className="text-sm font-semibold text-slate-100">Повторы слов</h2>
      <p className="text-xs text-slate-400">
        Частые слова повышают «тошноту». Замените повторы синонимами.
      </p>

      <ul className="mt-2 flex flex-col gap-2">
        {repeats.map((item) => (
          <li key={item.word} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-300">
              «{item.word}» ×{item.count}
            </span>
            <button
              type="button"
              onClick={() => replaceRepeats(item.word, item.synonym)}
              className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-200 transition-colors hover:bg-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Заменить на «{item.synonym}»
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
