import { unzipSync } from "fflate";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 50000;

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)));
}

function docxToText(buffer: ArrayBuffer): string {
  const files = unzipSync(new Uint8Array(buffer));
  const documentFile = files["word/document.xml"];
  if (!documentFile) throw new Error("docx: нет word/document.xml");

  const xml = new TextDecoder("utf-8").decode(documentFile);

  return decodeEntities(
    xml
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("Файл больше 5 МБ. Разделите документ на части.");
  }

  const name = file.name.toLowerCase();
  let text = "";

  if (name.endsWith(".pdf")) {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      if (typeof window !== "undefined") {
        pdfjs.GlobalWorkerOptions.workerSrc =
          process.env.NEXT_PUBLIC_PDF_WORKER_URL ?? "/api/pdf-worker";
      }

      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages: string[] = [];
      let extractedChars = 0;
      try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .filter(Boolean)
            .join(" ");
          extractedChars += pageText.length + 1;
          if (extractedChars > MAX_TEXT_LENGTH) {
            throw new Error(
              `В файле больше ${MAX_TEXT_LENGTH.toLocaleString("ru-RU")} символов. Разделите документ на части.`,
            );
          }
          pages.push(pageText);
        }
      } finally {
        await pdf.destroy();
      }
      text = pages.join("\n");
    } catch (error) {
      if (error instanceof Error && error.name === "PasswordException") {
        throw new Error("PDF защищён паролем. Снимите защиту перед загрузкой.");
      }
      if (
        error instanceof Error &&
        (error.name === "InvalidPDFException" || error.name === "FormatError")
      ) {
        throw new Error("Не удалось прочитать PDF. Проверьте, что файл не повреждён.");
      }
      throw error;
    }
  } else if (name.endsWith(".docx")) {
    text = docxToText(await file.arrayBuffer());
  } else if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".rtf")) {
    text = await file.text();
  } else {
    throw new Error("Поддерживаются .txt, .md, .rtf, .docx и текстовые PDF");
  }

  const trimmed = text.trim();
  if (!trimmed) throw new Error("В файле не нашлось текста");
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error(`В файле больше ${MAX_TEXT_LENGTH.toLocaleString("ru-RU")} символов. Разделите документ на части.`);
  }

  return trimmed;
}
