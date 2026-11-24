import type { YouTubeVideoItem } from "../types";

/**
 * Flip this flag to `true` once YouTube videos are uploaded and listed below.
 * Note: On native Android APK, the Videos tab is always shown and reads from local storage.
 */
export const ENABLE_WEB_YOUTUBE_TAB = false;

/**
 * Populate with YouTube video IDs (e.g. "dQw4w9WgXcQ") when ready.
 */
export const YOUTUBE_VIDEOS: YouTubeVideoItem[] = [];
