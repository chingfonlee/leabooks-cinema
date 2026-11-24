export type LanguageCode = "zh" | "en" | "cs";
export type SubtitleScale = "sm" | "md" | "lg";

export interface CinemaBookPage {
  page: number;
  image: string;
  text: Record<LanguageCode, string>;
}

export interface CinemaBook {
  order: number;
  slug: string;
  sourceName: string;
  title: Record<LanguageCode, string>;
  summary: Record<LanguageCode, string>;
  coverImage: string;
  musicSrc?: string;
  pageCount: number;
  pages: CinemaBookPage[];
}

export interface AboutSection {
  headingText: string;
  paragraphs: string[];
}

export interface AboutArticle {
  lang: LanguageCode;
  title: string;
  openingParagraphs: string[];
  sections: AboutSection[];
}

export interface LocalVideoItem {
  id: string;
  fileName: string;
  displayTitle: string;
  playUrl: string;
  sizeBytes: number;
  mimeType: string;
  matchedBookSlug?: string;
  coverImage?: string;
}

export interface YouTubeVideoItem {
  id: string;
  youtubeId: string;
  bookSlug?: string;
  title: Record<LanguageCode, string>;
  coverImage?: string;
}

export interface AppSettings {
  language: LanguageCode;
  pageDurationSec: number; // 0 = smart by word count (5-35s), or fixed seconds (10/15/20/30)
  idleResumeSec: number; // default 30 (0 = disabled)
  musicVolume: number; // 0..1
  musicMuted: boolean;
  subtitleScale: SubtitleScale;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "zh",
  pageDurationSec: 0,
  idleResumeSec: 30,
  musicVolume: 0.25,
  musicMuted: false,
  subtitleScale: "md",
};
