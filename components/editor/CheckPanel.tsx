"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2, SpellCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { analyzeText } from "@/lib/ai/analysis";
import { buildDocx } from "@/lib/utils/docx";
import { apiUrl } from "@/lib/utils/api-url";
import { useAssistantStore } from "@/lib/store/assistant-store";
import type { CheckIssue, CheckIssueType } from "@/types/ai";
import { cn } from "@/lib/utils/cn";

type CheckSource = "engine" | "cache" | "local";
type Filter = "all" | CheckIssueType;
interface ProductStats {
  checks: number;
  suggestions: number;
  accepted: number;
  lastCheckedAt: number | null;
}

const STATS_KEY = "ai-editor:stats:v1";
const EMPTY_STATS: ProductStats = {
  checks: 0,
  suggestions: 0,
  accepted: 0,
  lastCheckedAt: null,
};

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Все" },
  { id: "spelling", label: "Орфография" },
  { id: "punctuation", label: "Пунктуация" },
  { id: "grammar", label: "Грамматика" },
  { id: "style", label: "Стиль" },
];

function isSafe(issue: CheckIssue): boolean {
  return issue.replacements.length === 1;
}

export function CheckPanel() {
  const documentText = useAssistantStore((state) => state.documentText);
  const setDocumentText = useAssistantStore((state) => state.setDocumentText);
  const issues = useAssistantStore((state) => state.issues);
  const activeIssue = useAssistantStore((state) => state.activeIssue);
  const setIssues = useAssistantStore((state) => state.setIssues);
  const focusIssue = useAssistantStore((state) => state.focusIssue);
  const applyIssue = useAssistantStore((state) => state.applyIssue);
  const ignoredWords = useAssistantStore((state) => state.ignoredWords);
  const ignoreWord = useAssistantStore((state) => state.ignoreWord);
  const removeIgnoredWord = useAssistantStore((state) => state.removeIgnoredWord);
  const strictness = useAssistantStore((state) => state.strictness);
  const setStrictness = useAssistantStore((state) => state.setStrictness);
  const history = useAssistantStore((state) => state.history);
  const restoreHistory = useAssistantStore((state) => state.restoreHistory);
  const pushHistory = useAssistantStore((state) => state.pushHistory);

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<CheckSource | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [applied, setApplied] = useState(0);
  const [stats, setStats] = useState<ProductStats>(EMPTY_STATS);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [comparisonId, setComparisonId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(STATS_KEY) ?? "null");
      if (typeof saved === "object" && saved !== null) {
        const candidate = saved as Partial<ProductStats>;
        setStats({
          checks: typeof candidate.checks === "number" ? candidate.checks : 0,
          suggestions: typeof candidate.suggestions === "number" ? candidate.suggestions : 0,
          accepted: typeof candidate.accepted === "number" ? candidate.accepted : 0,
          lastCheckedAt:
            typeof candidate.lastCheckedAt === "number" ? candidate.lastCheckedAt : null,
        });
      }
    } catch {
      window.localStorage.removeItem(STATS_KEY);
    }
    setStatsLoaded(true);
  }, []);

  useEffect(() => {
    if (statsLoaded) window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats, statsLoaded]);

  const words = useMemo(() => analyzeText(documentText).words, [documentText]);
  const perHundred = words ? Math.round((issues.length / words) * 100) : 0;
  const tooLong = documentText.length > 50000;

  useEffect(() => {
    setStatus("idle");
    setError(null);
    setSource(null);
  }, [documentText]);

  const visible = useMemo(
    () => (filter === "all" ? issues : issues.filter((issue) => issue.issueType === filter)),
    [issues, filter],
  );

  const safeIssues = useMemo(() => {
    const result: CheckIssue[] = [];
    let occupiedUntil = -1;
    for (const issue of issues.filter(isSafe).sort((a, b) => a.offset - b.offset)) {
      if (issue.offset < occupiedUntil) continue;
      result.push(issue);
      occupiedUntil = issue.offset + issue.length;
    }
    return result;
  }, [issues]);
  const safeCount = safeIssues.length;
  const comparedVersion = history.find((entry) => entry.id === comparisonId) ?? null;
  const comparisonMetrics = comparedVersion ? analyzeText(comparedVersion.text) : null;
  const currentMetrics = comparedVersion ? analyzeText(documentText) : null;

  const runCheck = useCallback(async () => {
    if (!documentText.trim()) return;

    setStatus("loading");
    setError(null);
    setApplied(0);

    try {
      const response = await fetch(apiUrl("/api/check"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: documentText }),
      });

      if (response.status === 429) {
        const data = (await response.json()) as { retryAfterSeconds?: number };
        const minutes = Math.max(1, Math.ceil((data.retryAfterSeconds ?? 60) / 60));
        setStatus("error");
        setRemaining(0);
        setError(`Лимит проверок исчерпан. Следующая — через ${minutes} мин.`);
        return;
      }

      if (!response.ok) {
        setStatus("error");
        setError(
          response.status === 413
            ? "Текст длиннее 50 000 символов — разделите документ на части."
            : "Сервис проверки недоступен. Попробуйте позже.",
        );
        return;
      }

      const data = (await response.json()) as {
        matches?: CheckIssue[];
        source?: CheckSource;
        remaining?: number;
      };

      setIssues(data.matches ?? []);
      setStats((current) => ({
        ...current,
        checks: current.checks + 1,
        suggestions: current.suggestions + (data.matches?.length ?? 0),
        lastCheckedAt: Date.now(),
      }));
      setSource(data.source ?? "engine");
      setRemaining(typeof data.remaining === "number" ? data.remaining : null);
      setFilter("all");
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Не удалось связаться с сервисом проверки.");
    }
  }, [documentText, setIssues]);

  const applyAllSafe = useCallback(() => {
    const safe = safeIssues;
    if (!safe.length) return;

    let text = documentText;
    for (const issue of [...safe].sort((a, b) => b.offset - a.offset)) {
      const replacement = issue.replacements[0] ?? "";
      text = text.slice(0, issue.offset) + replacement + text.slice(issue.offset + issue.length);
    }

    pushHistory("Применены правки");
    setDocumentText(text);
    setStats((current) => ({ ...current, accepted: current.accepted + safe.length }));
    setApplied(safe.length);
    setStatus("idle");
    setSource(null);
  }, [documentText, pushHistory, safeIssues, setDocumentText]);

  const reset = useCallback(() => {
    setIssues([]);
    setStatus("idle");
    setError(null);
    setSource(null);
    setApplied(0);
  }, [setIssues]);

  const downloadTxt = useCallback(() => {
    const blob = new Blob([documentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "text.txt";
    link.click();
    URL.revokeObjectURL(url);
  }, [documentText]);

  const downloadDocx = useCallback(() => {
    const bytes = buildDocx(documentText);
    const blob = new Blob([bytes.buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "document.docx";
    link.click();
    URL.revokeObjectURL(url);
  }, [documentText]);

  const downloadPdf = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setStatus("error");
      setError("Разрешите всплывающие окна, чтобы сохранить документ в PDF.");
      return;
    }

    const escapedText = documentText.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character] ?? character;
    });
    printWindow.document.write(
      `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Текст</title><style>body{font:12pt/1.6 Arial,sans-serif;margin:2cm}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}</style></head><body><pre>${escapedText}</pre><script>window.onload=()=>window.print()</script></body></html>`,
    );
    printWindow.document.close();
  }, [documentText]);

  const activeInVisible = visible.findIndex((issue) => issue === issues[activeIssue]);

  const step = (direction: 1 | -1) => {
    if (!visible.length) return;
    const next = (activeInVisible + direction + visible.length) % visible.length;
    const target = visible[next];
    const targetIndex = issues.findIndex((issue) => issue === target);
    if (targetIndex >= 0) focusIssue(targetIndex);
  };

  const subtitle =
    applied > 0
      ? `Применено правок: ${applied}. Запустите проверку снова, чтобы увидеть остальные`
      : status === "done"
        ? issues.length === 0
          ? "Ошибок не найдено"
          : `Найдено: ${issues.length} · ${perHundred} на 100 слов${
              source === "local" ? " · локальные правила" : ""
            }`
        : status === "loading"
          ? "Проверяю текст…"
          : "Найдите ошибки и примените исправление в один клик";

  return (
    <section aria-label="Проверка текста" className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Проверка орфографии и грамматики</h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {remaining !== null && (
            <span className="text-[11px] text-slate-500">осталось {remaining} проверок</span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={downloadTxt}
            disabled={!documentText.trim()}
            icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            TXT
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={downloadDocx}
            disabled={!documentText.trim()}
            icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            DOCX
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={downloadPdf}
            disabled={!documentText.trim()}
            icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            PDF
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={status === "done" ? reset : runCheck}
            isLoading={status === "loading"}
            disabled={!documentText.trim() || status === "loading" || tooLong}
            icon={
              status === "done" ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <SpellCheck className="h-4 w-4" aria-hidden="true" />
              )
            }
          >
            {status === "done" ? "Сбросить" : "Проверить"}
          </Button>
        </div>
      </div>

      {tooLong && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Проверка ограничена 50 000 символами. Разделите документ на части.
        </p>
      )}

      {status === "loading" && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Проверяю текст…
        </p>
      )}

      {status === "error" && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {status === "done" && issues.length === 0 && (
        <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Замечаний нет — текст выглядит грамотно.
        </p>
      )}

      {issues.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {FILTERS.map((item) => {
              const count =
                item.id === "all"
                  ? issues.length
                  : issues.filter((issue) => issue.issueType === item.id).length;
              if (count === 0 && item.id !== "all") return null;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                    filter === item.id
                      ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-200"
                      : "border-slate-700 text-slate-400 hover:text-slate-200",
                  )}
                >
                  {item.label} · {count}
                </button>
              );
            })}

            <label className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
              Режим
              <select
                value={strictness}
                onChange={(event) =>
                  setStrictness(event.target.value as "soft" | "strict" | "errors")
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <option value="soft">Мягко</option>
                <option value="strict">Строго</option>
                <option value="errors">Только ошибки</option>
              </select>
            </label>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Предыдущая ошибка"
                className="rounded-md border border-slate-700 p-1 text-slate-400 transition-colors hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span className="text-[11px] text-slate-400">
                {activeInVisible >= 0 ? activeInVisible + 1 : 1} из {visible.length}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Следующая ошибка"
                className="rounded-md border border-slate-700 p-1 text-slate-400 transition-colors hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            {safeCount > 0 && (
              <Button variant="link" size="sm" onClick={applyAllSafe}>
                Применить безопасные · {safeCount}
              </Button>
            )}
          </div>

          <ul className="mt-2 flex max-h-[260px] flex-col gap-2 overflow-y-auto scrollbar-thin">
            {visible.map((issue) => {
              const index = issues.findIndex((item) => item === issue);
              return (
                <li
                  key={`${issue.offset}-${issue.rule}`}
                  onClick={() => focusIssue(index)}
                  className={cn(
                    "cursor-pointer rounded-lg border px-3 py-2 transition-colors",
                    index === activeIssue
                      ? "border-indigo-400/50 bg-indigo-500/10"
                      : "border-slate-700/70 bg-slate-900/50 hover:border-slate-600",
                  )}
                >
                  <p className="text-xs text-slate-200">
                    <span className="font-medium text-amber-300">
                      {documentText.slice(issue.offset, issue.offset + issue.length)}
                    </span>{" "}
                    — {issue.message}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {issue.rule && source !== "local" && (
                      <a
                        href={`https://community.languagetool.org/rule/show/${encodeURIComponent(issue.rule)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 underline decoration-slate-600 underline-offset-2 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        Правило {issue.rule}
                      </a>
                    )}
                    {issue.replacements.map((replacement) => (
                      <button
                        key={replacement}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          applyIssue(index, replacement);
                          setStats((current) => ({ ...current, accepted: current.accepted + 1 }));
                        }}
                        className={cn(
                          "rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-200",
                          "transition-colors hover:bg-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                        )}
                      >
                        {replacement}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        ignoreWord(
                          documentText.slice(issue.offset, issue.offset + issue.length),
                        );
                      }}
                      className="rounded-md px-1.5 py-0.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      В словарь
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {ignoredWords.length > 0 && (
        <div className="mt-3 border-t border-slate-700/60 pt-2">
          <p className="text-[11px] text-slate-500">
            Свой словарь: {ignoredWords.length} — эти слова не считаются ошибками
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ignoredWords.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => removeIgnoredWord(word)}
                title="Убрать из словаря"
                className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400 transition-colors hover:border-red-500/40 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {word} ×
              </button>
            ))}
          </div>
        </div>
      )}
      {history.length > 0 && (
        <details className="mt-3 border-t border-slate-700/60 pt-2">
          <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-300">
            История версий · {history.length}
          </summary>
          <ul className="mt-2 flex max-h-[160px] flex-col gap-1 overflow-y-auto scrollbar-thin">
            {history.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => restoreHistory(entry.id)}
                  title="Вернуть эту версию"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[11px] text-slate-400 transition-colors hover:bg-slate-900/60 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <span className="truncate">{entry.label}</span>
                  <span className="shrink-0 text-slate-500">
                    {new Date(entry.at).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setComparisonId((current) => (current === entry.id ? null : entry.id))
                  }
                  className="px-2 pb-1 text-[11px] text-indigo-300 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  {comparisonId === entry.id ? "Скрыть сравнение" : "Сравнить с текущим"}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {comparedVersion && comparisonMetrics && currentMetrics && (
        <section
          aria-label="Сравнение версий"
          className="mt-3 rounded-lg border border-indigo-500/30 bg-slate-900/40 p-3"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-medium text-slate-200">
              Сравнение: {comparedVersion.label} → текущая версия
            </h3>
            <span className="text-[11px] text-slate-400">
              {currentMetrics.words - comparisonMetrics.words > 0 ? "+" : ""}
              {currentMetrics.words - comparisonMetrics.words} слов ·{" "}
              {currentMetrics.chars - comparisonMetrics.chars > 0 ? "+" : ""}
              {currentMetrics.chars - comparisonMetrics.chars} символов
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="min-w-0 rounded-md border border-slate-700/70 p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Было</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-300">
                {comparedVersion.text}
              </pre>
            </div>
            <div className="min-w-0 rounded-md border border-slate-700/70 p-2">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Стало</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-300">
                {documentText}
              </pre>
            </div>
          </div>
        </section>
      )}
      <details className="mt-3 border-t border-slate-700/60 pt-2">
        <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-300">
          Моя статистика
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-400 sm:grid-cols-4">
          <span>Проверок: {stats.checks}</span>
          <span>Замечаний: {stats.suggestions}</span>
          <span>Принято правок: {stats.accepted}</span>
          <span>
            Принято:{" "}
            {stats.suggestions
              ? `${Math.round((stats.accepted / stats.suggestions) * 100)}%`
              : "—"}
          </span>
          {stats.lastCheckedAt && (
            <span className="col-span-2 sm:col-span-4">
              Последняя проверка:{" "}
              {new Date(stats.lastCheckedAt).toLocaleString("ru-RU", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>
      </details>
    </section>
  );
}
