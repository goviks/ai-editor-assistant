"use client";

import { Sparkles, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { extractTextFromFile } from "@/lib/utils/files";
import { useAssistantStore } from "@/lib/store/assistant-store";

const GHOST_TEXT =
  "Привет, Ирина! Хочу обсудить лендинг. Мы хотим запустить его 14 ноября и надо чтобы к этому времени были готовы тексты, дизайн и аналитика. По текстам жду от тебя правки до пятницы. Дизайн почти готов, осталось согласовать главный экран. Аналитику настроим на следующей неделе. Если сроки не устраивают, скажи что сдвинуть.";

interface EditorCardProps {
  onImprove: () => void;
  isBusy: boolean;
}

interface Segment {
  text: string;
  issue: boolean;
  active: boolean;
}

function buildSegments(
  text: string,
  issues: Array<{ offset: number; length: number }>,
  activeIndex: number,
): Segment[] {
  const sorted = [...issues].sort((a, b) => a.offset - b.offset);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const [index, issue] of sorted.entries()) {
    const start = Math.max(cursor, Math.min(issue.offset, text.length));
    const end = Math.max(start, Math.min(issue.offset + issue.length, text.length));

    if (start > cursor) segments.push({ text: text.slice(cursor, start), issue: false, active: false });
    if (end > start) {
      segments.push({ text: text.slice(start, end), issue: true, active: index === activeIndex });
    }
    cursor = end;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), issue: false, active: false });
  return segments;
}

export function EditorCard({ onImprove, isBusy }: EditorCardProps) {
  const documentText = useAssistantStore((state) => state.documentText);
  const selection = useAssistantStore((state) => state.selection);
  const caretRequest = useAssistantStore((state) => state.caretRequest);
  const setDocumentText = useAssistantStore((state) => state.setDocumentText);
  const setSelection = useAssistantStore((state) => state.setSelection);
  const clearCaretRequest = useAssistantStore((state) => state.clearCaretRequest);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setFileError(null);
      try {
        const text = await extractTextFromFile(file);
        useAssistantStore.getState().pushHistory("Загружен файл");
        setDocumentText(text);
      } catch (error) {
        setFileError(error instanceof Error ? error.message : "Не удалось прочитать файл");
      }
    },
    [setDocumentText],
  );

  const issues = useAssistantStore((state) => state.issues);
  const activeIssue = useAssistantStore((state) => state.activeIssue);
  const highlightRange = useAssistantStore((state) => state.highlightRange);

  const segments = useMemo(
    () => buildSegments(documentText, issues, activeIssue),
    [documentText, issues, activeIssue],
  );

  useEffect(() => {
    if (caretRequest === null) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(caretRequest, caretRequest);
    clearCaretRequest();
  }, [caretRequest, clearCaretRequest]);

  useEffect(() => {
    if (!highlightRange) return;
    const el = textareaRef.current;
    if (!el) return;

    el.focus();
    el.setSelectionRange(highlightRange.start, highlightRange.end);

    const before = el.value.slice(0, highlightRange.start);
    const line = before.split("\n").length - 1;
    el.scrollTop = Math.max(0, line * 22 - el.clientHeight / 3);
  }, [highlightRange]);

  const syncSelection = useCallback(
    (el: HTMLTextAreaElement) => {
      const { selectionStart, selectionEnd } = el;
      setSelection(
        selectionStart === selectionEnd
          ? null
          : { start: selectionStart, end: selectionEnd },
      );
    },
    [setSelection],
  );

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocumentText(event.target.value);
    syncSelection(event.target);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (hasText && !isBusy) onImprove();
    }
  };

  const selectedChars = selection ? selection.end - selection.start : 0;
  const words = documentText.trim() ? documentText.trim().split(/\s+/).length : 0;
  const hasText = documentText.trim().length > 0;
  const canImprove = hasText && !isBusy;

  const insertExample = () => {
    useAssistantStore.getState().pushHistory("Перед вставкой примера");
    setDocumentText(GHOST_TEXT);
    setIsFocused(true);
  };

  return (
    <section
      aria-labelledby="editor-heading"
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
      className={cn(
        "flex min-w-0 flex-1 flex-col rounded-xl border bg-slate-800 p-4 transition-colors",
        isDragging ? "border-indigo-400" : "border-slate-700",
      )}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 id="editor-heading" className="text-lg font-semibold text-slate-100">
            Черновик
          </h2>
          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-400">
            {words} слов · {documentText.length.toLocaleString("ru-RU")} / 50 000 симв.
          </span>
        </div>

        <p
          className={cn(
            "text-xs",
            selectedChars > 0 ? "text-indigo-300" : "text-slate-400",
          )}
        >
          {selectedChars > 0
            ? `Выделено ${selectedChars} симв.`
            : hasText
              ? "Без выделения будет переписан весь текст"
              : "Начните печатать — кнопка станет активной"}
        </p>
      </header>

      <div className="relative flex flex-1 flex-col">
        {!documentText && !isFocused && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden p-3 text-sm leading-relaxed text-slate-500/90"
          >
            {GHOST_TEXT}
          </div>
        )}

        {issues.length > 0 && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg p-3">
            <div
              ref={overlayRef}
              className="whitespace-pre-wrap break-words text-sm leading-relaxed text-transparent"
            >
              {segments.map((segment, index) =>
                segment.issue ? (
                  <mark
                    key={index}
                    className={cn(
                      "rounded-sm text-transparent",
                      segment.active ? "bg-indigo-500/40" : "bg-red-500/25",
                    )}
                  >
                    {segment.text}
                  </mark>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )}
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={documentText}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onScroll={(event) => {
            if (overlayRef.current) {
              overlayRef.current.style.transform = `translateY(-${event.currentTarget.scrollTop}px)`;
            }
          }}
          onSelect={(event) => syncSelection(event.currentTarget)}
          onKeyUp={(event) => syncSelection(event.currentTarget)}
          onMouseUp={(event) => syncSelection(event.currentTarget)}
          onKeyDown={handleKeyDown}
          aria-label="Черновик заметки или письма"
          aria-describedby="editor-hint"
          placeholder=""
          spellCheck={false}
          className={cn(
            "scrollbar-thin relative z-20 min-h-[300px] w-full flex-1 resize-none rounded-lg border bg-transparent p-3",
            "border-slate-700/80 text-sm leading-relaxed text-slate-100 caret-indigo-300 placeholder:text-slate-400",
            "transition-colors focus:border-indigo-500 focus:outline-none",
            "focus-visible:ring-2 focus-visible:ring-indigo-500/60",
          )}
        />
      </div>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p id="editor-hint" className="text-xs text-slate-400">
            Ctrl + Enter — улучшить выделенное или весь текст
          </p>
          {fileError && <p className="text-xs text-red-400">{fileError}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.rtf,.docx,.pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileRef.current?.click()}
            icon={<Upload className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Файл
          </Button>

          {!hasText && (
            <Button variant="ghost" size="sm" onClick={insertExample}>
              Вставить пример
            </Button>
          )}

          <Button
            onClick={onImprove}
            disabled={!canImprove}
            icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            title={
              selectedChars === 0
                ? "Переписать весь текст"
                : "Улучшить выделенный фрагмент"
            }
          >
            Улучшить с AI
          </Button>
        </div>
      </footer>
    </section>
  );
}
