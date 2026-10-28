"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2, SpellCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { analyzeText } from "@/lib/ai/analysis";
import { buildDocx } from "@/lib/utils/docx";
import { useAssistantStore } from "@/lib/store/assistant-store";
import type { CheckIssue, CheckIssueType } from "@/types/ai";
import { cn } from "@/lib/utils/cn";

type CheckSource = "engine" | "cache" | "local";
type Filter = "all" | CheckIssueType;

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

  const words = useMemo(() => analyzeText(documentText).words, [documentText]);
  const perHundred = words ? Math.round((issues.length / words) * 100) : 0;

  const visible = useMemo(
    () => (filter === "all" ? issues : issues.filter((issue) => issue.issueType === filter)),
    [issues, filter],
  );

  const safeCount = useMemo(() => issues.filter(isSafe).length, [issues]);

  const runCheck = useCallback(async () => {
    if (!documentText.trim()) return;

    setStatus("loading");
    setError(null);
    setApplied(0);

    try {
      const response = await fetch("/api/check", {
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
            ? "Текст длиннее 5000 символов — сократите фрагмент для проверки."
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
    const safe = issues.filter(isSafe);
    if (!safe.length) return;

    let text = documentText;
    for (const issue of [...safe].sort((a, b) => b.offset - a.offset)) {
      const replacement = issue.replacements[0] ?? "";
      text = text.slice(0, issue.offset) + replacement + text.slice(issue.offset + issue.length);
    }

    pushHistory("Применены правки");
    setDocumentText(text);
    setApplied(safe.length);
    setStatus("idle");
    setSource(null);
  }, [documentText, issues, pushHistory, setDocumentText]);

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
            variant="secondary"
            size="sm"
            onClick={status === "done" ? reset : runCheck}
            isLoading={status === "loading"}
            disabled={!documentText.trim() || status === "loading"}
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

            <button
              type="button"
              onClick={() => setStrictness(strictness === "all" ? "errors" : "all")}
              title="Показывать только ошибки или ещё и стиль"
              className={cn(
                "ml-auto rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                strictness === "errors"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-700 text-slate-400 hover:text-slate-200",
              )}
            >
              {strictness === "errors" ? "Только ошибки" : "Все замечания"}
            </button>
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
                    {issue.replacements.map((replacement) => (
                      <button
                        key={replacement}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          applyIssue(index, replacement);
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
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
