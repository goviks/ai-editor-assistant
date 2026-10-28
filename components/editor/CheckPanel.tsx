"use client";

import { CheckCircle2, Download, Loader2, SpellCheck } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useAssistantStore } from "@/lib/store/assistant-store";
import { cn } from "@/lib/utils/cn";

interface Issue {
  offset: number;
  length: number;
  message: string;
  rule: string;
  replacements: string[];
}

type CheckSource = "engine" | "cache" | "local";

export function CheckPanel() {
  const documentText = useAssistantStore((state) => state.documentText);
  const setDocumentText = useAssistantStore((state) => state.setDocumentText);

  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<CheckSource | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const runCheck = useCallback(async () => {
    if (!documentText.trim()) return;

    setStatus("loading");
    setError(null);

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
        setError(`Лимит бесплатных проверок исчерпан. Следующая — через ${minutes} мин.`);
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
        matches?: Issue[];
        source?: CheckSource;
        remaining?: number;
      };

      setIssues(data.matches ?? []);
      setSource(data.source ?? "engine");
      setRemaining(typeof data.remaining === "number" ? data.remaining : null);
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Не удалось связаться с сервисом проверки.");
    }
  }, [documentText]);

  const applyReplacement = useCallback(
    (issue: Issue, replacement: string) => {
      const next =
        documentText.slice(0, issue.offset) + replacement + documentText.slice(issue.offset + issue.length);
      setDocumentText(next);

      const delta = replacement.length - issue.length;
      setIssues((current) =>
        current
          .filter((item) => item.offset !== issue.offset)
          .map((item) =>
            item.offset > issue.offset ? { ...item, offset: item.offset + delta } : item,
          ),
      );
    },
    [documentText, setDocumentText],
  );

  const reset = useCallback(() => {
    setIssues([]);
    setStatus("idle");
    setError(null);
    setSource(null);
  }, []);

  const download = useCallback(() => {
    const blob = new Blob([documentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "text.txt";
    link.click();
    URL.revokeObjectURL(url);
  }, [documentText]);

  const subtitle =
    status === "done"
      ? issues.length === 0
        ? "Ошибок не найдено"
        : `Найдено замечаний: ${issues.length}${source === "local" ? " · локальные правила" : ""}`
      : status === "loading"
        ? "Проверяю текст…"
        : "Найдите ошибки и примените исправление в один клик";

  return (
    <section
      aria-label="Проверка текста"
      className="rounded-xl border border-slate-700 bg-slate-800 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Проверка орфографии и грамматики
          </h2>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {remaining !== null && (
            <span className="text-[11px] text-slate-500">
              осталось {remaining} проверок
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={download}
            disabled={!documentText.trim()}
            icon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Скачать
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
        <ul className="mt-3 flex max-h-[260px] flex-col gap-2 overflow-y-auto scrollbar-thin">
          {issues.map((issue) => (
            <li
              key={`${issue.offset}-${issue.rule}`}
              className="rounded-lg border border-slate-700/70 bg-slate-900/50 px-3 py-2"
            >
              <p className="text-xs text-slate-200">
                <span className="font-medium text-amber-300">
                  {documentText.slice(issue.offset, issue.offset + issue.length)}
                </span>{" "}
                — {issue.message}
              </p>
              {issue.replacements.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {issue.replacements.map((replacement) => (
                    <button
                      key={replacement}
                      type="button"
                      onClick={() => applyReplacement(issue, replacement)}
                      className={cn(
                        "rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-200",
                        "transition-colors hover:bg-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                      )}
                    >
                      {replacement}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
