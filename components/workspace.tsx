"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { CheckPanel } from "@/components/editor/CheckPanel";
import { EditorCard } from "@/components/editor/EditorCard";
import { TextMetrics } from "@/components/editor/TextMetrics";
import { useAIStream } from "@/lib/hooks/use-ai-stream";
import { useAssistantStore } from "@/lib/store/assistant-store";
import type { AssistMode } from "@/types/ai";

const DRAFT_KEY = "ai-editor:draft:v2";

export function Workspace() {
  const status = useAssistantStore((state) => state.status);
  const insertResult = useAssistantStore((state) => state.insertResult);
  const documentText = useAssistantStore((state) => state.documentText);
  const setDocumentText = useAssistantStore((state) => state.setDocumentText);

  const { run, cancel, retry } = useAIStream();
  const [panelOpen, setPanelOpen] = useState(false);

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
    const timer = setTimeout(() => {
      if (documentText.trim()) {
        window.localStorage.setItem(DRAFT_KEY, documentText);
      } else {
        window.localStorage.removeItem(DRAFT_KEY);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [documentText]);

  return (
    <>
      <div className="flex flex-col gap-6 pb-24 md:flex-row md:items-start md:pb-0">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <EditorCard onImprove={handleImprove} isBusy={isBusy} />
          <TextMetrics />
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
