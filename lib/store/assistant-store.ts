"use client";

import { create } from "zustand";

import type { AIError, AssistMode, AssistantStatus, StreamMeta } from "@/types/ai";

export interface SelectionRange {
  start: number;
  end: number;
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

  setDocumentText: (text: string) => void;
  setSelection: (selection: SelectionRange | null) => void;
  setMode: (mode: AssistMode) => void;
  insertResult: () => void;
  clearCaretRequest: () => void;

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
    set({ documentText: text, selection: nextSelection });
  },

  setSelection: (selection) => set({ selection }),

  setMode: (mode) => set({ mode }),

  insertResult: () => {
    const { documentText, selection, result, sourceRange } = get();
    if (!result) return;

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
