import { useCallback, useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { CINEMA_BOOKS, getBookBySlug } from "./data/books";
import {
  isNativeAndroid,
  listLocalVideos,
  pickLocalVideoFolder,
} from "./plugins/localVideoLibrary";
import { AutoplayModal } from "./components/AutoplayModal";
import { BookReader } from "./components/BookReader";
import { HomeShelf, type ShelfTab } from "./components/HomeShelf";
import { SettingsModal } from "./components/SettingsModal";
import { VideoPlayer } from "./components/VideoPlayer";
import { YouTubePlayerModal } from "./components/YouTubePlayerModal";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type CinemaBook,
  type LanguageCode,
  type LocalVideoItem,
  type YouTubeVideoItem,
} from "./types";

const SETTINGS_STORAGE_KEY = "leabooks-cinema-settings-v2";

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

type ViewState =
  | { mode: "shelf" }
  | { mode: "reader"; playlist: CinemaBook[]; initialAutoplay: boolean }
  | { mode: "localVideo"; initialIndex: number }
  | { mode: "youtubeVideo"; video: YouTubeVideoItem };

export function App() {
  const [view, setView] = useState<ViewState>({ mode: "shelf" });
  const [activeTab, setActiveTab] = useState<ShelfTab>("books");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showAutoplayModal, setShowAutoplayModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [videos, setVideos] = useState<LocalVideoItem[]>([]);
  const [videoFolderName, setVideoFolderName] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);

  const updateSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleLanguageChange = useCallback(
    (language: LanguageCode) => {
      updateSettings({ ...settings, language });
    },
    [settings, updateSettings],
  );

  const loadVideosFromDisk = useCallback(async () => {
    if (!isNativeAndroid()) return;
    setVideoLoading(true);
    try {
      const res = await listLocalVideos(settings.language);
      setVideoFolderName(res.folderName);
      setVideos(res.videos);
    } catch {
      // Folder may not be authorized yet
    } finally {
      setVideoLoading(false);
    }
  }, [settings.language]);

  useEffect(() => {
    loadVideosFromDisk();
  }, [loadVideosFromDisk]);

  // Toggle TV remote focus ring visibility automatically between touch and D-Pad
  useEffect(() => {
    const onPointerOrTouch = () => {
      document.body.classList.remove("tv-remote-mode");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.startsWith("Arrow") ||
        e.key === "Enter" ||
        e.key === "Select" ||
        e.key === "Tab"
      ) {
        document.body.classList.add("tv-remote-mode");
      }
    };
    window.addEventListener("touchstart", onPointerOrTouch, { passive: true });
    window.addEventListener("pointerdown", onPointerOrTouch, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("touchstart", onPointerOrTouch);
      window.removeEventListener("pointerdown", onPointerOrTouch);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Support direct deep links like /books/<slug>/<lang> or /about/<lang> on Web
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "");
    const bookMatch = path.match(/^\/books\/([^/]+)(?:\/(zh|en|cs))?$/);
    if (bookMatch) {
      const slug = bookMatch[1];
      const langParam = bookMatch[2] as LanguageCode | undefined;
      const idx = CINEMA_BOOKS.findIndex((b) => b.slug === slug);
      if (idx >= 0) {
        setCarouselIndex(idx);
        if (langParam) {
          setSettings((prev) => ({ ...prev, language: langParam }));
        }
        setView({
          mode: "reader",
          playlist: [CINEMA_BOOKS[idx]],
          initialAutoplay: false,
        });
      }
      return;
    }
    const aboutMatch = path.match(/^\/about(?:\/(zh|en|cs))?$/);
    if (aboutMatch) {
      const langParam = aboutMatch[1] as LanguageCode | undefined;
      if (langParam) {
        setSettings((prev) => ({ ...prev, language: langParam }));
      }
      setActiveTab("about");
    }
  }, []);

  // Android hardware back button
  useEffect(() => {
    const handlePromise = CapApp.addListener("backButton", () => {
      if (showAutoplayModal) {
        setShowAutoplayModal(false);
      } else if (showSettingsModal) {
        setShowSettingsModal(false);
      } else if (view.mode !== "shelf") {
        setView({ mode: "shelf" });
      } else {
        CapApp.exitApp();
      }
    });
    return () => {
      handlePromise.then((h) => h.remove()).catch(() => {});
    };
  }, [showAutoplayModal, showSettingsModal, view.mode]);

  const handlePickVideoFolder = async () => {
    setVideoLoading(true);
    try {
      const res = await pickLocalVideoFolder(settings.language);
      setVideoFolderName(res.folderName);
      setVideos(res.videos);
    } catch {
      // Cancelled
    } finally {
      setVideoLoading(false);
    }
  };

  const handleOpenBook = (slug: string, autoplay: boolean) => {
    const book = getBookBySlug(slug);
    if (!book) return;
    setView({
      mode: "reader",
      playlist: [book],
      initialAutoplay: autoplay,
    });
  };

  const handleStartAutoplayPlaylist = (slugs: string[]) => {
    const playlist = slugs
      .map((s) => getBookBySlug(s))
      .filter((b): b is CinemaBook => Boolean(b));
    if (playlist.length === 0) return;
    setShowAutoplayModal(false);
    setView({
      mode: "reader",
      playlist,
      initialAutoplay: true,
    });
  };

  if (view.mode === "reader") {
    return (
      <BookReader
        playlist={view.playlist}
        initialAutoplay={view.initialAutoplay}
        settings={settings}
        onLanguageChange={handleLanguageChange}
        onToggleMute={() =>
          updateSettings({ ...settings, musicMuted: !settings.musicMuted })
        }
        onExit={() => setView({ mode: "shelf" })}
      />
    );
  }

  if (view.mode === "localVideo") {
    return (
      <VideoPlayer
        videos={videos}
        initialIndex={view.initialIndex}
        language={settings.language}
        onExit={() => setView({ mode: "shelf" })}
      />
    );
  }

  if (view.mode === "youtubeVideo") {
    return (
      <YouTubePlayerModal
        video={view.video}
        language={settings.language}
        onExit={() => setView({ mode: "shelf" })}
      />
    );
  }

  return (
    <>
      <HomeShelf
        activeTab={activeTab}
        onTabChange={setActiveTab}
        language={settings.language}
        onLanguageChange={handleLanguageChange}
        books={CINEMA_BOOKS}
        carouselIndex={carouselIndex}
        onCarouselIndexChange={setCarouselIndex}
        pageDurationSec={settings.pageDurationSec}
        videos={videos}
        videoFolderName={videoFolderName}
        videoLoading={videoLoading}
        spatialNavEnabled={!showAutoplayModal && !showSettingsModal}
        onOpenBook={handleOpenBook}
        onOpenAutoplayModal={() => setShowAutoplayModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onPickVideoFolder={handlePickVideoFolder}
        onRescanVideos={loadVideosFromDisk}
        onPlayLocalVideo={(idx) => setView({ mode: "localVideo", initialIndex: idx })}
        onPlayYouTubeVideo={(video) => setView({ mode: "youtubeVideo", video })}
      />

      {showAutoplayModal && (
        <AutoplayModal
          books={CINEMA_BOOKS}
          language={settings.language}
          pageDurationSec={settings.pageDurationSec}
          onClose={() => setShowAutoplayModal(false)}
          onStartAutoplay={handleStartAutoplayPlaylist}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onChange={updateSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </>
  );
}
