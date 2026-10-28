import type { AssistMode } from "@/types/ai";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export const MODE_LABELS: Record<AssistMode, string> = {
  improve: "Улучшить",
  shorten: "Сократить",
};

const SYSTEM_PROMPT = [
  "Ты — опытный редактор русскоязычных текстов.",
  "Ты получаешь фрагмент черновика и переписываешь его.",
  "Правила:",
  "1. Отвечай только готовым текстом — без вступлений, пояснений и markdown.",
  "2. Сохраняй смысл, факты, имена, цифры и обращение к адресату.",
  "3. Не добавляй факты, которых нет во фрагменте.",
  "4. Пиши на том же языке, что и фрагмент.",
  "5. Длина результата — близкая к исходной, если не просят иное.",
].join("\n");

const MODE_INSTRUCTIONS: Record<AssistMode, string> = {
  improve:
    "Отредактируй текст по литературной норме: разговорные слова замени нейтральными, расставь знаки препинания, убери слова-сорняки и повторы. Смысл сохрани полностью.",
  shorten:
    "Сократи текст примерно на треть, оставив только существенное. Смысл и все факты должны сохраниться, но слов должно стать заметно меньше.",
};

export function buildMessages(text: string, mode: AssistMode): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        MODE_INSTRUCTIONS[mode],
        "",
        "Фрагмент (между маркерами):",
        "<<<",
        text,
        ">>>",
      ].join("\n"),
    },
  ];
}

export function maxInputChars(): number {
  const parsed = Number.parseInt(process.env.AI_MAX_INPUT_CHARS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 6000;
}
