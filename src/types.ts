export type LanguageCode = "zh" | "en" | "cs";

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
  pageDurationSec: number; // default 15
  idleResumeSec: number; // default 60 (0 = disabled)
  musicVolume: number; // 0..1
  musicMuted: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "zh",
  pageDurationSec: 15,
  idleResumeSec: 60,
  musicVolume: 0.7,
  musicMuted: false,
};
