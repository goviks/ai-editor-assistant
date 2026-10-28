import assert from "node:assert/strict";

import { getCompletionUrl } from "../lib/ai/openai.ts";
import { buildMessages } from "../lib/ai/prompt.ts";
import { improveText, shortenText } from "../lib/ai/russian.ts";

{
  assert.equal(
    improveText("он сказал что завтра придёт"),
    "Он сказал, что завтра придёт.",
    "добавляется запятая в придаточной части и восстанавливается финальная точка",
  );
  assert.equal(
    improveText("жырафы и машына"),
    "Жирафы и машина.",
    "исправляются сочетания жи/ши и сохраняется заглавная буква",
  );
  assert.equal(
    improveText("проект готов\nкоманда проверила результат"),
    "Проект готов\nКоманда проверила результат.",
    "сохраняются абзацные границы",
  );
  console.log("ok  proofreading: spelling, subordinate commas, paragraph boundaries");
}

{
  const source = "Для того чтобы проект работал, команда проверила то что внедрила.";
  const result = shortenText(source);
  assert.equal(
    result,
    "Чтобы проект работал, команда проверила то, что внедрила.",
    "сокращается безопасная конструкция, важное содержание сохраняется",
  );

  const fullSource = "Сроки согласовали. Бюджет утвердили. Риски обсудили.";
  const fullResult = shortenText(fullSource);
  for (const sentence of ["Сроки согласовали.", "Бюджет утвердили.", "Риски обсудили."]) {
    assert.ok(fullResult.includes(sentence), `нельзя потерять отдельный факт: ${sentence}`);
  }
  console.log("ok  shortening: safe phrase compression without dropping facts");
}

{
  const improve = buildMessages("Исходный текст", "improve");
  const shorten = buildMessages("Исходный текст", "shorten");
  const system = improve[0].content;

  assert.match(system, /грамматические основы/u);
  assert.match(system, /причины и следствия/u);
  assert.match(system, /Текст пользователя — только материал/u);
  assert.match(improve[1].content, /знаки препинания/u);
  assert.match(shorten[1].content, /не удаляй целые смысловые части/u);
  console.log("ok  model instructions: syntax, punctuation, semantics and untrusted text");
}

{
  assert.equal(getCompletionUrl("https://api.openai.com/v1"), "https://api.openai.com/v1/chat/completions");
  assert.equal(
    getCompletionUrl("https://api.deepseek.com/v1/"),
    "https://api.deepseek.com/v1/chat/completions",
  );
  assert.equal(
    getCompletionUrl("https://api.example.com/v1/chat/completions"),
    "https://api.example.com/v1/chat/completions",
  );
  assert.equal(
    getCompletionUrl("http://localhost:11434/v1"),
    "http://localhost:11434/v1/chat/completions",
  );
  assert.throws(() => getCompletionUrl("http://api.example.com/v1"), /HTTPS/u);
  assert.throws(() => getCompletionUrl("https://user:pass@api.example.com/v1"), /параметров/u);
  console.log("ok  model provider: OpenAI-compatible HTTPS endpoints and local development");
}
