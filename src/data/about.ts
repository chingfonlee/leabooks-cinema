import rawAbout from "./about.generated.json";
import type { AboutArticle, LanguageCode } from "../types";

export const ABOUT_ARTICLES: Record<LanguageCode, AboutArticle> =
  rawAbout as Record<LanguageCode, AboutArticle>;
