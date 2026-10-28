"use client";

import { create } from "zustand";

import type {
  AIError,
  AssistMode,
  AssistantStatus,
  CheckIssue,
  StreamMeta,
} from "@/types/ai";

export interface SelectionRange {
  start: number;
  end: number;
}

export interface HistoryEntry {
  id: string;
  label: string;
  text: string;
  at: number;
}

const ERROR_TYPES = new Set(["spelling", "punctuation", "grammar", "typography"]);
const SOFT_TYPES = new Set(["spelling", "punctuation", "grammar"]);

function filterIssues(
  issues: CheckIssue[],
  strictness: "soft" | "strict" | "errors",
  ignoredWords: string[],
  documentText: string,
): CheckIssue[] {
  return issues.filter((issue) => {
    if (strictness === "errors" && !ERROR_TYPES.has(issue.issueType)) return false;
    if (strictness === "soft" && !SOFT_TYPES.has(issue.issueType)) return false;
    const fragment = documentText
      .slice(issue.offset, issue.offset + issue.length)
      .toLowerCase()
      .trim();
    return !ignoredWords.includes(fragment);
  });
}

interface AssistantState {
  documentText: string;
  selection: SelectionRange | null;
  caretRequest: number | null;

  status: AssistantStatus;
  result: string;
  error: AIError | null;
  meta: StreamMeta | null;
  source: string;
  sourceRange: SelectionRange | null;
  mode: AssistMode;

  issues: CheckIssue[];
  allIssues: CheckIssue[];
  activeIssue: number;
  highlightRange: SelectionRange | null;
  ignoredWords: string[];
  strictness: "soft" | "strict" | "errors";
  history: HistoryEntry[];

  setDocumentText: (text: string) => void;
  setSelection: (selection: SelectionRange | null) => void;
  setMode: (mode: AssistMode) => void;
  insertResult: () => void;
  clearCaretRequest: () => void;

  setIssues: (issues: CheckIssue[]) => void;
  focusIssue: (index: number) => void;
  applyIssue: (index: number, replacement: string) => void;
  clearHighlight: () => void;
  setIgnoredWords: (words: string[]) => void;
  ignoreWord: (word: string) => void;
  removeIgnoredWord: (word: string) => void;
  setStrictness: (strictness: "soft" | "strict" | "errors") => void;
  setHistory: (history: HistoryEntry[]) => void;
  pushHistory: (label: string) => void;
  restoreHistory: (id: string) => void;
  begin: (source: string, range: SelectionRange) => void;
  appendDelta: (delta: string) => void;
  succeed: (meta: StreamMeta | null) => void;
  fail: (error: AIError) => void;
  markAborted: () => void;
  reset: () => void;
}

const initialState = {
  documentText: "",
  selection: null,
  caretRequest: null,
  status: "idle" as AssistantStatus,
  result: "",
  error: null,
  meta: null,
  source: "",
  sourceRange: null,
  mode: "improve" as AssistMode,
  issues: [] as CheckIssue[],
  allIssues: [] as CheckIssue[],
  activeIssue: 0,
  highlightRange: null,
  ignoredWords: [] as string[],
  strictness: "soft" as "soft" | "strict" | "errors",
  history: [] as HistoryEntry[],
};

export function getSelectedText(
  state: Pick<AssistantState, "documentText" | "selection">,
): string {
  const { documentText, selection } = state;
  if (!selection) return "";
  const start = Math.max(0, Math.min(selection.start, documentText.length));
  const end = Math.max(start, Math.min(selection.end, documentText.length));
  return documentText.slice(start, end);
}

export const useAssistantStore = create<AssistantState>()((set, get) => ({
  ...initialState,

  setDocumentText: (text) => {
    const { selection } = get();
    const nextSelection =
      selection && selection.end <= text.length ? selection : null;
    set({
      documentText: text,
      selection: nextSelection,
      issues: [],
      allIssues: [],
      activeIssue: 0,
      highlightRange: null,
    });
  },

  setSelection: (selection) => set({ selection }),

  setMode: (mode) => set({ mode }),

  setIssues: (issues) => {
    const { documentText, ignoredWords, strictness } = get();
    const filtered = filterIssues(issues, strictness, ignoredWords, documentText);
    const first = filtered[0];

    set({
      allIssues: issues,
      issues: filtered,
      activeIssue: 0,
      highlightRange: first
        ? { start: first.offset, end: first.offset + first.length }
        : null,
    });
  },

  setStrictness: (strictness) => {
    const { allIssues, ignoredWords, documentText } = get();
    const filtered = filterIssues(allIssues, strictness, ignoredWords, documentText);
    const first = filtered[0];

    set({
      strictness,
      issues: filtered,
      activeIssue: 0,
      highlightRange: first
        ? { start: first.offset, end: first.offset + first.length }
        : null,
    });
  },

  setHistory: (history) => set({ history: history.slice(0, 20) }),

  pushHistory: (label) => {
    const { documentText, history } = get();
    if (!documentText.trim()) return;
    if (history[0]?.text === documentText) return;

    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      label,
      text: documentText,
      at: Date.now(),
    };

    set({ history: [entry, ...history].slice(0, 20) });
  },

  restoreHistory: (id) => {
    const entry = get().history.find((item) => item.id === id);
    if (!entry) return;
    set({
      documentText: entry.text,
      issues: [],
      allIssues: [],
      activeIssue: 0,
      highlightRange: null,
      selection: null,
    });
  },

  setIgnoredWords: (words) =>
    set({ ignoredWords: Array.from(new Set(words.map((word) => word.toLowerCase().trim()).filter(Boolean))) }),

  ignoreWord: (word) => {
    const normalized = word.toLowerCase().trim();
    if (!normalized) return;

    const { ignoredWords, allIssues, documentText, strictness } = get();
    if (ignoredWords.includes(normalized)) return;

    const nextIgnored = [...ignoredWords, normalized];
    const remaining = filterIssues(allIssues, strictness, nextIgnored, documentText);
    const first = remaining[0];

    set({
      ignoredWords: nextIgnored,
      issues: remaining,
      activeIssue: 0,
      highlightRange: first
        ? { start: first.offset, end: first.offset + first.length }
        : null,
    });
  },

  removeIgnoredWord: (word) => {
    const { ignoredWords, allIssues, documentText, strictness } = get();
    const nextIgnored = ignoredWords.filter((item) => item !== word);
    const filtered = filterIssues(allIssues, strictness, nextIgnored, documentText);
    const first = filtered[0];

    set({
      ignoredWords: nextIgnored,
      issues: filtered,
      activeIssue: 0,
      highlightRange: first
        ? { start: first.offset, end: first.offset + first.length }
        : null,
    });
  },

  focusIssue: (index) => {
    const issue = get().issues[index];
    if (!issue) return;
    set({
      activeIssue: index,
      highlightRange: { start: issue.offset, end: issue.offset + issue.length },
    });
  },

  applyIssue: (index, replacement) => {
    const { issues, allIssues, documentText, activeIssue } = get();
    const issue = issues[index];
    if (!issue) return;

    get().pushHistory("Исправление ошибки");

    const nextText =
      documentText.slice(0, issue.offset) + replacement + documentText.slice(issue.offset + issue.length);
    const delta = replacement.length - issue.length;

    const remaining = issues
      .filter((_, position) => position !== index)
      .map((item) => (item.offset > issue.offset ? { ...item, offset: item.offset + delta } : item));
    const remainingAll = allIssues
      .filter((item) => item !== issue)
      .map((item) => (item.offset > issue.offset ? { ...item, offset: item.offset + delta } : item));

    const nextIndex = Math.min(activeIssue, Math.max(0, remaining.length - 1));
    const target = remaining[nextIndex];

    set({
      documentText: nextText,
      issues: remaining,
      allIssues: remainingAll,
      activeIssue: nextIndex,
      highlightRange: target
        ? { start: target.offset, end: target.offset + target.length }
        : null,
      selection: { start: issue.offset, end: issue.offset },
    });
  },

  clearHighlight: () => set({ highlightRange: null }),

  insertResult: () => {
    const { documentText, selection, result, sourceRange } = get();
    if (!result) return;

    get().pushHistory("Вставка ответа");

    const range = sourceRange ?? selection ?? { start: documentText.length, end: documentText.length };
    const start = Math.max(0, Math.min(range.start, documentText.length));
    const end = Math.max(start, Math.min(range.end, documentText.length));
    const nextText = `${documentText.slice(0, start)}${result}${documentText.slice(end)}`;

    set({
      documentText: nextText,
      selection: { start, end: start },
      sourceRange: null,
      caretRequest: start + result.length,
    });
  },

  clearCaretRequest: () => set({ caretRequest: null }),

  begin: (source, range) =>
    set({
      status: "loading",
      result: "",
      error: null,
      meta: null,
      source,
      sourceRange: range,
    }),

  appendDelta: (delta) =>
    set((state) => ({
      status: "streaming",
      result: state.result + delta,
    })),

  succeed: (meta) => set({ status: "success", meta, error: null }),

  fail: (error) => set({ status: "error", error }),

  markAborted: () => set({ status: "aborted" }),

  reset: () => set({ ...initialState, documentText: get().documentText, mode: get().mode }),
}));
