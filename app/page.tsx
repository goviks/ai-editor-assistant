import { Workspace } from "@/components/workspace";

const GITHUB = "https://github.com/goviks";
const RESUME = "https://hh.ru/resume/9680e743ff114a1e9b0039ed1f734957555442";
const EMAIL = "goviks@yandex.ru";

const PROJECTS = [
  {
    name: "denis-durnov-portfolio-api",
    note: "NestJS · GraphQL · Prisma · PostgreSQL",
    href: `${GITHUB}/denis-durnov-portfolio-api`,
  },
  {
    name: "workspace-ultra",
    note: "TypeScript · Vite · Tailwind",
    href: `${GITHUB}/workspace-ultra`,
  },
  {
    name: "Tutchev",
    note: "HTML · вёрстка",
    href: `${GITHUB}/Tutchev`,
  },
];

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-4">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      {children}
    </article>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex items-center justify-between gap-2 text-xs text-indigo-400 transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
    >
      <span className="truncate">{label}</span>
      <span aria-hidden="true" className="shrink-0 text-slate-500 group-hover:text-indigo-300">
        ↗
      </span>
    </a>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
          AI-редактор{" "}
          <span className="text-base font-normal text-slate-500 md:text-lg">
            by Denis Durnov
          </span>
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Вставьте текст и нажмите «Улучшить с AI»: ответ придёт потоком.
          Выделите фрагмент — перепишется только он.
        </p>
      </header>

      <Workspace />

      <section aria-label="Обо мне" className="grid gap-3 md:grid-cols-3">
        <SectionCard title="Кто я">
          <p className="text-xs leading-relaxed text-slate-400">
            Fullstack-разработчик. TypeScript, Python, API. Опыт в Т-Банке
            и Яндексе — 2 года 2 месяца.
          </p>
          <div className="mt-auto flex flex-col gap-1.5 border-t border-slate-700/60 pt-3">
            <LinkRow href={GITHUB} label="github.com/goviks" />
            <LinkRow href={RESUME} label="Резюме на hh.ru" />
          </div>
        </SectionCard>

        <SectionCard title="Обо мне">
          <p className="text-xs leading-relaxed text-slate-400">
            Инициировал переход на электронный документооборот в Министерстве
            обороны РФ — подготовка документов быстрее на 30%.
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            Оптимизировал модуль классификации инцидентов в Т-Банке — решение
            тикетов быстрее на 15%.
          </p>
          <div className="mt-auto border-t border-slate-700/60 pt-3">
            <LinkRow href={`mailto:${EMAIL}`} label={EMAIL} />
          </div>
        </SectionCard>

        <SectionCard title="Проекты">
          <ul className="flex flex-col gap-2">
            {PROJECTS.map((project) => (
              <li key={project.name}>
                <LinkRow href={project.href} label={project.name} />
                <p className="text-[11px] text-slate-500">{project.note}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </section>

      <section aria-label="Тарифы" className="grid gap-3 md:grid-cols-2">
        <article className="flex flex-col gap-2 rounded-xl border border-slate-700/70 bg-slate-800/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Бесплатно</h2>
          <p className="text-2xl font-semibold text-slate-100">0 ₽</p>
          <ul className="flex flex-col gap-1 text-xs leading-relaxed text-slate-400">
            <li>20 проверок за 10 минут</li>
            <li>тексты до 5000 знаков</li>
            <li>улучшение и сокращение без ограничений</li>
            <li>метрики и инфостиль</li>
          </ul>
        </article>

        <article className="flex flex-col gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/5 p-4">
          <h2 className="text-sm font-semibold text-slate-100">Pro</h2>
          <p className="text-2xl font-semibold text-indigo-300">по запросу</p>
          <ul className="flex flex-col gap-1 text-xs leading-relaxed text-slate-400">
            <li>без лимита проверок</li>
            <li>свой словарь терминов и исключений</li>
            <li>проверка через API для команды</li>
            <li>отчёт по документам и экспорт</li>
          </ul>
          <a
            href={`mailto:${EMAIL}?subject=AI-редактор: доступ Pro`}
            className="mt-1 text-xs text-indigo-400 transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Написать о доступе ↗
          </a>
        </article>
      </section>

      <footer className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        Все права сохранены — 2026
      </footer>
    </main>
  );
}
