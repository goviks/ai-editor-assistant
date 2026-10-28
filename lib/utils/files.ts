import { unzipSync } from "fflate";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_LENGTH = 20000;

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

  if (name.endsWith(".docx")) {
    text = docxToText(await file.arrayBuffer());
  } else if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".rtf")) {
    text = await file.text();
  } else {
    throw new Error("Поддерживаются .txt, .md и .docx");
  }

  const trimmed = text.trim();
  if (!trimmed) throw new Error("В файле не нашлось текста");

  return trimmed.slice(0, MAX_TEXT_LENGTH);
}
