const CONTACTS = [
  { href: "https://t.me/goviks", label: "Telegram", value: "@goviks" },
  { href: "mailto:goviks@yandex.ru", label: "Почта", value: "goviks@yandex.ru" },
  { href: "https://github.com/goviks", label: "GitHub", value: "github.com/goviks" },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-400">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl space-y-1.5">
          <h2 className="font-semibold text-slate-200">Об авторе</h2>
          <p className="leading-relaxed">
            Денис Дурнов — разработчик этого AI-редактора. Собрал проверку,
            понятные рекомендации и инструменты для правки текста в одном месте.
          </p>
        </div>
        <nav aria-label="Контакты автора" className="flex flex-wrap gap-x-4 gap-y-2">
          {CONTACTS.map(({ href, label, value }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("https://") ? "_blank" : undefined}
              rel={href.startsWith("https://") ? "noreferrer" : undefined}
              className="rounded-sm transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <span className="sr-only">{label}: </span>
              {value}
            </a>
          ))}
        </nav>
      </div>
      <p className="mt-5 border-t border-slate-800/70 pt-3">
        Черновик хранится локально в этом браузере. Текст отправляется на сервер только
        при запуске AI-редактуры или проверки.
      </p>
      <p className="mt-2 text-slate-500">© 2026 Денис Дурнов</p>
    </footer>
  );
}
