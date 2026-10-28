export type RuleKind =
  | "усилитель"
  | "оценка"
  | "канцелярит"
  | "штамп"
  | "вода"
  | "неопределённость"
  | "конструкция";

export interface Rule {
  from: string;
  to: string;
  kind: RuleKind;
}

export interface Issue {
  text: string;
  kind: RuleKind;
  hint: string;
}

const RULES: Rule[] = [
  { from: "безусловно", to: "", kind: "усилитель" },
  { from: "бесспорно", to: "", kind: "усилитель" },
  { from: "безусловный", to: "", kind: "усилитель" },
  { from: "очень", to: "", kind: "усилитель" },
  { from: "крайне", to: "", kind: "усилитель" },
  { from: "совершенно", to: "", kind: "усилитель" },
  { from: "абсолютно", to: "", kind: "усилитель" },
  { from: "максимально", to: "", kind: "усилитель" },
  { from: "наиболее", to: "", kind: "усилитель" },
  { from: "буквально", to: "", kind: "усилитель" },
  { from: "действительно", to: "", kind: "усилитель" },
  { from: "поистине", to: "", kind: "усилитель" },
  { from: "чрезвычайно", to: "", kind: "усилитель" },
  { from: "невероятно", to: "", kind: "усилитель" },
  { from: "удивительно", to: "", kind: "усилитель" },

  { from: "качественный", to: "хороший", kind: "оценка" },
  { from: "уникальный", to: "особый", kind: "оценка" },
  { from: "уникальная", to: "особая", kind: "оценка" },
  { from: "лучший", to: "хороший", kind: "оценка" },
  { from: "отличный", to: "хороший", kind: "оценка" },
  { from: "великолепный", to: "хороший", kind: "оценка" },
  { from: "потрясающий", to: "сильный", kind: "оценка" },
  { from: "инновационный", to: "новый", kind: "оценка" },
  { from: "эффективный", to: "результативный", kind: "оценка" },
  { from: "оптимальный", to: "подходящий", kind: "оценка" },
  { from: "надёжный", to: "устойчивый", kind: "оценка" },
  { from: "современный", to: "актуальный", kind: "оценка" },
  { from: "передовой", to: "новый", kind: "оценка" },
  { from: "высококлассный", to: "сильный", kind: "оценка" },
  { from: "профессиональный", to: "опытный", kind: "оценка" },
  { from: "успешный", to: "результативный", kind: "оценка" },
  { from: "перспективный", to: "потенциальный", kind: "оценка" },
  { from: "масштабный", to: "большой", kind: "оценка" },
  { from: "амбициозный", to: "сложный", kind: "оценка" },
  { from: "значимый", to: "важный", kind: "оценка" },
  { from: "ведущий", to: "основной", kind: "оценка" },
  { from: "лидирующий", to: "основной", kind: "оценка" },

  { from: "является", to: "—", kind: "канцелярит" },
  { from: "являются", to: "—", kind: "канцелярит" },
  { from: "осуществляется", to: "идёт", kind: "канцелярит" },
  { from: "производится", to: "идёт", kind: "канцелярит" },
  { from: "выполняется", to: "идёт", kind: "канцелярит" },
  { from: "обеспечивает", to: "даёт", kind: "канцелярит" },
  { from: "данный", to: "этот", kind: "канцелярит" },
  { from: "данная", to: "эта", kind: "канцелярит" },
  { from: "данное", to: "это", kind: "канцелярит" },
  { from: "данные", to: "эти", kind: "канцелярит" },
  { from: "вышеуказанный", to: "этот", kind: "канцелярит" },
  { from: "нижеследующий", to: "следующий", kind: "канцелярит" },
  { from: "соответствующий", to: "нужный", kind: "канцелярит" },
  { from: "в соответствии с", to: "по", kind: "канцелярит" },
  { from: "в целях", to: "для", kind: "канцелярит" },
  { from: "в связи с", to: "из-за", kind: "канцелярит" },
  { from: "на основании", to: "по", kind: "канцелярит" },
  { from: "согласно", to: "по", kind: "канцелярит" },
  { from: "посредством", to: "через", kind: "канцелярит" },
  { from: "в рамках", to: "в", kind: "канцелярит" },
  { from: "в области", to: "в", kind: "канцелярит" },
  { from: "в процессе", to: "при", kind: "канцелярит" },
  { from: "в ходе", to: "при", kind: "канцелярит" },
  { from: "с целью", to: "чтобы", kind: "канцелярит" },
  { from: "в случае", to: "если", kind: "канцелярит" },
  { from: "при наличии", to: "если есть", kind: "канцелярит" },
  { from: "в отношении", to: "к", kind: "канцелярит" },
  { from: "в количестве", to: "", kind: "канцелярит" },
  { from: "в размере", to: "на", kind: "канцелярит" },
  { from: "на сегодняшний день", to: "сегодня", kind: "канцелярит" },
  { from: "в настоящее время", to: "сейчас", kind: "канцелярит" },
  { from: "на данный момент", to: "сейчас", kind: "канцелярит" },

  { from: "широкий спектр", to: "много", kind: "штамп" },
  { from: "широкий выбор", to: "выбор", kind: "штамп" },
  { from: "гибкая система", to: "система", kind: "штамп" },
  { from: "команда профессионалов", to: "команда", kind: "штамп" },
  { from: "индивидуальный подход", to: "подход", kind: "штамп" },
  { from: "динамично развивающаяся", to: "растущая", kind: "штамп" },
  { from: "ключевые компетенции", to: "навыки", kind: "штамп" },
  { from: "инновационные решения", to: "решения", kind: "штамп" },
  { from: "качественный продукт", to: "продукт", kind: "штамп" },
  { from: "лидер рынка", to: "крупный игрок", kind: "штамп" },
  { from: "высокие стандарты", to: "стандарты", kind: "штамп" },
  { from: "комплексный подход", to: "подход", kind: "штамп" },
  { from: "богатый опыт", to: "опыт", kind: "штамп" },

  { from: "разумеется", to: "", kind: "вода" },
  { from: "как известно", to: "", kind: "вода" },
  { from: "по сути", to: "", kind: "вода" },
  { from: "в принципе", to: "", kind: "вода" },
  { from: "на самом деле", to: "", kind: "вода" },
  { from: "так сказать", to: "", kind: "вода" },
  { from: "таким образом", to: "", kind: "вода" },
  { from: "иначе говоря", to: "", kind: "вода" },
  { from: "другими словами", to: "", kind: "вода" },
  { from: "как правило", to: "", kind: "вода" },
  { from: "в целом", to: "", kind: "вода" },
  { from: "конечно", to: "", kind: "вода" },
  { from: "кстати", to: "", kind: "вода" },
  { from: "итак", to: "", kind: "вода" },
  { from: "следовательно", to: "", kind: "вода" },
  { from: "например", to: "", kind: "вода" },
  { from: "наверное", to: "", kind: "вода" },
  { from: "возможно", to: "", kind: "вода" },
  { from: "кажется", to: "", kind: "вода" },
  { from: "по-моему", to: "", kind: "вода" },
  { from: "во-первых", to: "", kind: "вода" },
  { from: "во-вторых", to: "", kind: "вода" },
  { from: "наконец", to: "", kind: "вода" },
  { from: "словом", to: "", kind: "вода" },

  { from: "некоторые", to: "", kind: "неопределённость" },
  { from: "определённые", to: "", kind: "неопределённость" },
  { from: "определенные", to: "", kind: "неопределённость" },
  { from: "ряд", to: "", kind: "неопределённость" },
  { from: "около", to: "", kind: "неопределённость" },
  { from: "примерно", to: "", kind: "неопределённость" },
  { from: "достаточно", to: "", kind: "неопределённость" },
  { from: "довольно", to: "", kind: "неопределённость" },
  { from: "своего рода", to: "", kind: "неопределённость" },

  { from: "одна из главных проблем", to: "проблема", kind: "конструкция" },
  { from: "играет важную роль", to: "важен", kind: "конструкция" },
  { from: "оказывает влияние", to: "влияет", kind: "конструкция" },
  { from: "принимает участие", to: "участвует", kind: "конструкция" },
  { from: "осуществляет деятельность", to: "работает", kind: "конструкция" },
  { from: "проводит работу", to: "работает", kind: "конструкция" },
  { from: "было принято решение", to: "решили", kind: "конструкция" },
  { from: "было проведено", to: "провели", kind: "конструкция" },
];

const HINTS: Record<RuleKind, string> = {
  усилитель: "Усилитель: слово можно убрать без потери смысла",
  оценка: "Оценка без факта: читателю нужен факт, а не прилагательное",
  канцелярит: "Канцелярит: замените на простое действие",
  штамп: "Штамп: так пишут все, читатель не увидит смысла",
  вода: "Вода: вводная конструкция, не несущая информации",
  неопределённость: "Неопределённость: читатель не поймёт, о чём речь",
  конструкция: "Тяжёлая конструкция: есть короткий эквивалент",
};

const NO_AUTO = new Set([
  "является",
  "являются",
  "в соответствии с",
  "в рамках",
  "в области",
  "в процессе",
  "в ходе",
  "согласно",
  "посредством",
  "на основании",
  "в отношении",
  "в размере",
  "в случае",
  "при наличии",
  "с целью",
  "в связи с",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternFor(phrase: string): RegExp {
  return new RegExp(
    `(?<![а-яёa-z])${escapeRegExp(phrase)}(?![а-яёa-z])`,
    "giu",
  );
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const WATER_WORDS: string[] = RULES.filter(
  (rule) => rule.kind === "вода" || rule.kind === "усилитель",
).map((rule) => rule.from);

export interface LocalIssue {
  offset: number;
  length: number;
  message: string;
  replacements: string[];
  rule: string;
}

export function localIssues(text: string): LocalIssue[] {
  const issues: LocalIssue[] = [];

  for (const rule of RULES) {
    const pattern = patternFor(rule.from);
    let match = pattern.exec(text);

    while (match !== null) {
      issues.push({
        offset: match.index,
        length: match[0].length,
        message: HINTS[rule.kind],
        replacements: rule.to ? [rule.to] : [],
        rule: `local_${rule.kind}`,
      });

      if (pattern.lastIndex === match.index) pattern.lastIndex += 1;
      match = pattern.exec(text);
    }
  }

  return issues.sort((a, b) => a.offset - b.offset).slice(0, 60);
}

export function findIssues(text: string): Issue[] {
  const issues: Issue[] = [];

  for (const rule of RULES) {
    const matches = text.match(patternFor(rule.from));
    if (!matches) continue;
    for (const match of matches) {
      issues.push({ text: match, kind: rule.kind, hint: HINTS[rule.kind] });
    }
  }

  return issues;
}

export function scoreText(text: string): number {
  const total = countWords(text);
  if (total === 0) return 10;

  const issues = findIssues(text).length;
  const density = issues / total;
  return Math.max(1, Math.min(10, Math.round(10 - density * 20)));
}

export function cleanWithRules(text: string): string {
  let result = text;

  for (const rule of RULES) {
    if (NO_AUTO.has(rule.from)) continue;
    if (rule.kind === "оценка" || rule.kind === "неопределённость") continue;
    result = result.replace(patternFor(rule.from), rule.to);
  }

  return result;
}

export function compressWithRules(text: string): string {
  let result = text;

  for (const rule of RULES) {
    if (NO_AUTO.has(rule.from)) continue;
    result = result.replace(patternFor(rule.from), rule.to);
  }

  return result;
}
