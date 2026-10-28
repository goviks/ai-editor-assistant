import react from "@vitejs/plugin-react";
import { dirname } from "node:path";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const siteDirectory = dirname(fileURLToPath(import.meta.url));
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? "/ai-editor-assistant/" : "/";

export default defineConfig({
  root: siteDirectory,
  base: basePath,
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(siteDirectory, ".."),
    },
  },
  define: {
    "process.env.NEXT_PUBLIC_API_BASE_URL": JSON.stringify(
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
    ),
    "process.env.NEXT_PUBLIC_PDF_WORKER_URL": JSON.stringify(
      process.env.NEXT_PUBLIC_PDF_WORKER_URL ??
        `${basePath}pdf.worker.min.mjs`,
    ),
  },
  build: {
    outDir: resolve(siteDirectory, "../out"),
    emptyOutDir: true,
  },
});
