"use client";

import { MODE_LABELS } from "@/lib/ai/prompt";
import { useAssistantStore } from "@/lib/store/assistant-store";
import { cn } from "@/lib/utils/cn";
import type { AssistMode } from "@/types/ai";

const MODES: AssistMode[] = ["improve", "shorten"];

interface ModeSelectorProps {
  onSelect?: (mode: AssistMode) => void;
}

export function ModeSelector({ onSelect }: ModeSelectorProps) {
  const mode = useAssistantStore((state) => state.mode);
  const setMode = useAssistantStore((state) => state.setMode);
  const isBusy = useAssistantStore(
    (state) => state.status === "loading" || state.status === "streaming",
  );

  return (
    <div
      role="radiogroup"
      aria-label="Что сделать с текстом"
      className="flex gap-1 rounded-lg border border-slate-700/70 bg-slate-900/60 p-1"
    >
      {MODES.map((value) => {
        const active = value === mode;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={isBusy}
            onClick={() => {
              setMode(value);
              onSelect?.(value);
            }}
            className={cn(
              "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
              "disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-indigo-500 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
            )}
          >
            {MODE_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}
