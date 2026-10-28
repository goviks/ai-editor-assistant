"use client";

import { Moon, Sparkles, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { CheckPanel } from "@/components/editor/CheckPanel";
import { EditorCard } from "@/components/editor/EditorCard";
import { RepeatsPanel } from "@/components/editor/RepeatsPanel";
import { TextMetrics } from "@/components/editor/TextMetrics";
import { useAIStream } from "@/lib/hooks/use-ai-stream";
import { useAssistantStore } from "@/lib/store/assistant-store";
import type { HistoryEntry } from "@/lib/store/assistant-store";
import type { AssistMode } from "@/types/ai";

const DRAFT_KEY = "ai-editor:draft:v2";
const IGNORED_KEY = "ai-editor:ignored";
const HISTORY_KEY = "ai-editor:history:v1";
const THEME_KEY = "ai-editor:theme:v1";
const STRICTNESS_KEY = "ai-editor:strictness:v1";

export function Workspace() {
  const status = useAssistantStore((state) => state.status);
  const insertResult = useAssistantStore((state) => state.insertResult);
  const documentText = useAssistantStore((state) => state.documentText);
  const setDocumentText = useAssistantStore((state) => state.setDocumentText);
  const ignoredWords = useAssistantStore((state) => state.ignoredWords);
  const setIgnoredWords = useAssistantStore((state) => state.setIgnoredWords);
  const history = useAssistantStore((state) => state.history);
  const setHistory = useAssistantStore((state) => state.setHistory);
  const strictness = useAssistantStore((state) => state.strictness);
  const setStrictness = useAssistantStore((state) => state.setStrictness);

  const { run, cancel, retry } = useAIStream();
  const [panelOpen, setPanelOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const isBusy = status === "loading" || status === "streaming";

  const handleImprove = useCallback(() => {
    setPanelOpen(true);
    void run();
  }, [run]);

  const handleModeSelect = useCallback(
    (mode: AssistMode) => {
      setPanelOpen(true);
      void run(mode);
    },
    [run],
  );

  const handleInsert = useCallback(() => {
    insertResult();
    setPanelOpen(false);
  }, [insertResult]);

  useEffect(() => {
    if (!isBusy) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isBusy, cancel]);

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY);
    if (saved && saved.trim()) setDocumentText(saved);
  }, [setDocumentText]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    const savedStrictness = window.localStorage.getItem(STRICTNESS_KEY);
    if (
      savedStrictness === "soft" ||
      savedStrictness === "strict" ||
      savedStrictness === "errors"
    ) {
      setStrictness(savedStrictness);
    }

    try {
      const savedHistory: unknown = JSON.parse(
        window.localStorage.getItem(HISTORY_KEY) ?? "[]",
      );
      if (Array.isArray(savedHistory)) {
        setHistory(
          savedHistory.filter(
            (entry): entry is HistoryEntry =>
              typeof entry === "object" &&
              entry !== null &&
              typeof entry.id === "string" &&
              typeof entry.label === "string" &&
              typeof entry.text === "string" &&
              typeof entry.at === "number",
          ),
        );
      }
    } catch {
      window.localStorage.removeItem(HISTORY_KEY);
    }
    setHistoryLoaded(true);
  }, [setHistory, setStrictness]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!historyLoaded) return;
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history, historyLoaded]);

  useEffect(() => {
    window.localStorage.setItem(STRICTNESS_KEY, strictness);
  }, [strictness]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (documentText.trim()) {
        window.localStorage.setItem(DRAFT_KEY, documentText);
      } else {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [documentText]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(IGNORED_KEY);
      if (raw) setIgnoredWords(JSON.parse(raw) as string[]);
    } catch {
      window.localStorage.removeItem(IGNORED_KEY);
    }
  }, [setIgnoredWords]);

  useEffect(() => {
    window.localStorage.setItem(IGNORED_KEY, JSON.stringify(ignoredWords));
  }, [ignoredWords]);

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-xs text-slate-300 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
          {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        </button>
      </div>
      <div className="flex flex-col gap-6 pb-24 md:flex-row md:items-start md:pb-0">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <EditorCard onImprove={handleImprove} isBusy={isBusy} />
          <TextMetrics />
          <RepeatsPanel />
          <CheckPanel />
        </div>

        <AssistantPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onCancel={cancel}
          onRetry={retry}
          onInsert={handleInsert}
          onModeSelect={handleModeSelect}
        />
      </div>

      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 md:hidden"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          AI-ассистент
        </button>
      )}
    </>
  );
}
