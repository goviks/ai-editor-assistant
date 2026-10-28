"use client";

import { useMemo } from "react";

import { analyzeText, formatReadingTime } from "@/lib/ai/analysis";
import { useAssistantStore } from "@/lib/store/assistant-store";
import { cn } from "@/lib/utils/cn";

interface MetricProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}

function Metric({ label, value, hint, tone = "neutral" }: MetricProps) {
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2">
      <p
        className={cn(
          "text-base font-semibold leading-tight",
          tone === "good" && "text-emerald-400",
          tone === "warn" && "text-amber-400",
          tone === "bad" && "text-red-400",
          tone === "neutral" && "text-slate-100",
        )}
      >
        {value}
      </p>
      <p className="text-[11px] text-slate-400">{label}</p>
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function TextMetrics() {
  const documentText = useAssistantStore((state) => state.documentText);
  const metrics = useMemo(() => analyzeText(documentText), [documentText]);

  const waterTone = metrics.waterPercent > 20 ? "bad" : metrics.waterPercent > 10 ? "warn" : "good";
  const readabilityTone =
    metrics.readability >= 70 ? "good" : metrics.readability >= 50 ? "warn" : "bad";
  const spamTone = metrics.spamPercent > 12 ? "warn" : "good";

  return (
    <section
      aria-label="Метрики текста"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
    >
      <Metric label="символов" value={String(metrics.chars)} hint={`${metrics.charsNoSpaces} без пробелов`} />
      <Metric label="слов" value={String(metrics.words)} hint={`${metrics.sentences} предл.`} />
      <Metric
        label="вода"
        value={`${metrics.waterPercent}%`}
        hint="стоп-слова и усилители"
        tone={waterTone}
      />
      <Metric
        label="читаемость"
        value={`${metrics.readability}`}
        hint={metrics.readabilityLabel}
        tone={readabilityTone}
      />
      <Metric
        label="тошнота"
        value={`${metrics.spamPercent}%`}
        hint={metrics.topWords[0] ? `«${metrics.topWords[0].word}» ×${metrics.topWords[0].count}` : "нет повторов"}
        tone={spamTone}
      />
      <Metric
        label="чтение"
        value={formatReadingTime(metrics.readingSeconds)}
        hint={`${metrics.avgSentenceLength} слов в предложении`}
      />
    </section>
  );
}
