import { Capacitor, registerPlugin } from "@capacitor/core";
import { matchBookByFileName } from "../data/books";
import type { LanguageCode, LocalVideoItem } from "../types";

interface NativeVideoEntry {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  playUrl: string;
}

interface NativeListResult {
  hasFolder: boolean;
  folderName: string;
  videos: NativeVideoEntry[];
}

interface LocalVideoLibraryPlugin {
  getSavedFolder(): Promise<{ hasFolder: boolean; folderName: string }>;
  pickVideoFolder(): Promise<NativeListResult>;
  listVideos(): Promise<NativeListResult>;
}

const NativeLocalVideoLibrary =
  registerPlugin<LocalVideoLibraryPlugin>("LocalVideoLibrary");

let webFallbackFolderName = "";
let webFallbackEntries: NativeVideoEntry[] = [];

function toVideoItem(
  entry: NativeVideoEntry,
  lang: LanguageCode,
): LocalVideoItem {
  const matchedBook = matchBookByFileName(entry.name);
  const cleanTitle = entry.name.replace(/\.[^.]+$/, "");
  return {
    id: entry.id,
    fileName: entry.name,
    displayTitle: matchedBook ? matchedBook.title[lang] : cleanTitle,
    playUrl: entry.playUrl,
    sizeBytes: entry.size,
    mimeType: entry.mimeType,
    matchedBookSlug: matchedBook?.slug,
    coverImage: matchedBook?.coverImage,
  };
}

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function listLocalVideos(lang: LanguageCode): Promise<{
  hasFolder: boolean;
  folderName: string;
  videos: LocalVideoItem[];
}> {
  if (isNativeAndroid()) {
    const res = await NativeLocalVideoLibrary.listVideos();
    return {
      hasFolder: res.hasFolder,
      folderName: res.folderName,
      videos: res.videos.map((e) => toVideoItem(e, lang)),
    };
  }
  return {
    hasFolder: webFallbackEntries.length > 0,
    folderName: webFallbackFolderName,
    videos: webFallbackEntries.map((e) => toVideoItem(e, lang)),
  };
}

export async function pickLocalVideoFolder(lang: LanguageCode): Promise<{
  hasFolder: boolean;
  folderName: string;
  videos: LocalVideoItem[];
}> {
  if (isNativeAndroid()) {
    const res = await NativeLocalVideoLibrary.pickVideoFolder();
    return {
      hasFolder: res.hasFolder,
      folderName: res.folderName,
      videos: res.videos.map((e) => toVideoItem(e, lang)),
    };
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "video/mp4,video/webm,video/x-matroska,video/*";
    input.setAttribute("webkitdirectory", "");
    input.onchange = () => {
      const files = Array.from(input.files ?? []).filter((f) =>
        /\.(mp4|webm|mkv|mov)$/i.test(f.name),
      );
      for (const old of webFallbackEntries) {
        if (old.playUrl.startsWith("blob:")) URL.revokeObjectURL(old.playUrl);
      }
      files.sort((a, b) =>
        a.name.localeCompare(b.name, "zh-Hant", { numeric: true }),
      );
      const firstRel = (files[0] as File & { webkitRelativePath?: string })
        ?.webkitRelativePath;
      webFallbackFolderName = firstRel ? firstRel.split("/")[0] : "Local Folder";
      webFallbackEntries = files.map((file, idx) => ({
        id: `web-${idx}-${file.name}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || "video/mp4",
        playUrl: URL.createObjectURL(file),
      }));
      resolve({
        hasFolder: webFallbackEntries.length > 0,
        folderName: webFallbackFolderName,
        videos: webFallbackEntries.map((e) => toVideoItem(e, lang)),
      });
    };
    input.click();
  });
}
