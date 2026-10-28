import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI-редактор — Denis Durnov",
  description:
    "Текстовый редактор с AI-ассистентом: стриминг ответа по токенам, отмена запроса, понятные ошибки и доступный интерфейс.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-900 font-sans text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
