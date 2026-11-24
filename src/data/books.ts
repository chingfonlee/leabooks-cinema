import rawBooks from "./books.generated.json";
import type { CinemaBook } from "../types";

export const CINEMA_BOOKS: CinemaBook[] = rawBooks as CinemaBook[];

export function getBookBySlug(slug: string): CinemaBook | undefined {
  return CINEMA_BOOKS.find((b) => b.slug === slug);
}

export function normalizeMatchKey(input: string): string {
  return input
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[\s._-]+/, "")
    .replace(/[《》「」『』【】()（）,，、。！？!?：:；;—\-_\s]+/g, "")
    .toLowerCase()
    .trim();
}

export function matchBookByFileName(fileName: string): CinemaBook | undefined {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const normalizedFile = normalizeMatchKey(baseName);
  if (!normalizedFile) return undefined;

  for (const book of CINEMA_BOOKS) {
    const candidates = [
      book.title.zh,
      book.title.en,
      book.title.cs,
      book.sourceName,
      book.slug,
    ]
      .filter(Boolean)
      .map(normalizeMatchKey);

    if (
      candidates.some(
        (c) => c === normalizedFile || (c.length >= 2 && normalizedFile.includes(c)),
      )
    ) {
      return book;
    }
  }
  return undefined;
}
