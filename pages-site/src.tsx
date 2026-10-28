import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Workspace } from "@/components/workspace";

import "../app/globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root mount point");

createRoot(rootElement).render(
  <StrictMode>
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
          AI-редактор
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
          Вставьте текст для проверки или выберите фрагмент и запустите AI-редактуру.
        </p>
      </header>
      <Workspace />
      <footer className="border-t border-slate-800 pt-4 text-xs text-slate-500">
        Черновик хранится локально в этом браузере.
      </footer>
    </main>
  </StrictMode>,
);
