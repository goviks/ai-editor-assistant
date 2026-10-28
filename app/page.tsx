import { Workspace } from "@/components/workspace";

import { SiteFooter } from "@/components/SiteFooter";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
          AI-редактор
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Напишите или загрузите текст, проверьте его и выберите, какие правки принять.
          AI-ассистент улучшит весь текст или только выделенный фрагмент.
        </p>
      </header>

      <Workspace />

      <SiteFooter />
    </main>
  );
}
