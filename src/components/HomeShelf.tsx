import { useRef } from "react";
import {
  BookOpen,
  Film,
  FolderOpen,
  LayoutGrid,
  Play,
  RefreshCw,
  Settings,
} from "lucide-react";
import { ENABLE_WEB_YOUTUBE_TAB, YOUTUBE_VIDEOS } from "../data/youtubeVideos";
import { LANGUAGE_SHORT, UI_STRINGS } from "../i18n";
import { isNativeAndroid } from "../plugins/localVideoLibrary";
import type {
  CinemaBook,
  LanguageCode,
  LocalVideoItem,
  YouTubeVideoItem,
} from "../types";
import { useSpatialNavigation } from "../utils/tvNavigation";
import { AboutView } from "./AboutView";
import { BookshelfView } from "./BookshelfView";
import { HeroCarousel } from "./HeroCarousel";
import { TiltedStoryWall } from "./TiltedStoryWall";

export type ShelfTab = "books" | "shelf" | "videos" | "about";

interface HomeShelfProps {
  activeTab: ShelfTab;
  onTabChange: (tab: ShelfTab) => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  books: CinemaBook[];
  carouselIndex: number;
  onCarouselIndexChange: (idx: number) => void;
  musicMuted: boolean;
  onToggleMute: () => void;
  videos: LocalVideoItem[];
  videoFolderName: string;
  videoLoading: boolean;
  spatialNavEnabled: boolean;
  onOpenBook: (slug: string, autoplay: boolean) => void;
  onOpenAutoplayModal: () => void;
  onOpenSettings: () => void;
  onPickVideoFolder: () => void;
  onRescanVideos: () => void;
  onPlayLocalVideo: (index: number) => void;
  onPlayYouTubeVideo: (video: YouTubeVideoItem) => void;
}

const LANGS: LanguageCode[] = ["zh", "en", "cs"];

export function HomeShelf({
  activeTab,
  onTabChange,
  language,
  onLanguageChange,
  books,
  carouselIndex,
  onCarouselIndexChange,
  musicMuted,
  onToggleMute,
  videos,
  videoFolderName,
  videoLoading,
  spatialNavEnabled,
  onOpenBook,
  onOpenAutoplayModal,
  onOpenSettings,
  onPickVideoFolder,
  onRescanVideos,
  onPlayLocalVideo,
  onPlayYouTubeVideo,
}: HomeShelfProps) {
  const shelfRef = useRef<HTMLDivElement | null>(null);
  useSpatialNavigation(shelfRef, spatialNavEnabled);

  const strings = UI_STRINGS[language];
  const nativeAndroid = isNativeAndroid();
  const showVideosTab = nativeAndroid || ENABLE_WEB_YOUTUBE_TAB;

  const isBookMode = activeTab === "books" || activeTab === "shelf";

  return (
    <div className="shelf-shell" ref={shelfRef}>
      {isBookMode && books[carouselIndex] && (
        <TiltedStoryWall book={books[carouselIndex]} />
      )}
      <header className="shelf-header">
        <div className="brand-group">
          <img className="brand-logo" src="./logo.jpg" alt="Lea Books Logo" />
          <div className="brand-text">
            <span className="brand-title">Lea Books</span>
            <span className="brand-badge">{strings.brandSub}</span>
          </div>
        </div>

        <div className="nav-cluster">
          <nav className="tab-switcher" aria-label="Main navigation">
            <button
              className={`tab-btn ${activeTab === "books" ? "active" : ""}`}
              onClick={() => onTabChange("books")}
            >
              <BookOpen size={20} />
              {strings.tabBooks}
            </button>

            <button
              className={`tab-btn ${activeTab === "shelf" ? "active" : ""}`}
              onClick={() => onTabChange("shelf")}
            >
              <LayoutGrid size={20} />
              {strings.tabShelf}
            </button>

            {showVideosTab && (
              <button
                className={`tab-btn ${activeTab === "videos" ? "active" : ""}`}
                onClick={() => onTabChange("videos")}
              >
                <Film size={20} />
                {strings.tabVideos}
                {nativeAndroid ? ` (${videos.length})` : ""}
              </button>
            )}
          </nav>

          <button
            type="button"
            className={`nav-about-link ${activeTab === "about" ? "active" : ""}`}
            onClick={() => onTabChange("about")}
          >
            {strings.tabAbout}
          </button>
        </div>

        <div className="header-actions">
          <div className="lang-switcher" role="group" aria-label="Language">
            {LANGS.map((code) => (
              <button
                key={code}
                className={`lang-pill ${language === code ? "active" : ""}`}
                onClick={() => onLanguageChange(code)}
              >
                {LANGUAGE_SHORT[code]}
              </button>
            ))}
          </div>

          {isBookMode && (
            <button className="action-btn primary" onClick={onOpenAutoplayModal}>
              <Play size={18} />
              <span className="btn-label">{strings.btnAutoplayAll}</span>
            </button>
          )}

          <button className="action-btn" onClick={onOpenSettings} aria-label={strings.btnSettings}>
            <Settings size={18} />
            <span className="btn-label">{strings.btnSettings}</span>
          </button>
        </div>
      </header>

      <main className={`shelf-content ${isBookMode ? "carousel-mode" : ""}`}>
        {activeTab === "books" && (
          <HeroCarousel
            books={books}
            activeIndex={carouselIndex}
            language={language}
            musicMuted={musicMuted}
            keyboardActive={spatialNavEnabled}
            onChangeIndex={onCarouselIndexChange}
            onToggleMute={onToggleMute}
            onOpenBook={onOpenBook}
          />
        )}

        {activeTab === "shelf" && (
          <BookshelfView
            books={books}
            activeIndex={carouselIndex}
            language={language}
            musicMuted={musicMuted}
            onChangeIndex={onCarouselIndexChange}
            onToggleMute={onToggleMute}
            onOpenBook={onOpenBook}
          />
        )}

        {activeTab === "about" && <AboutView language={language} />}

        {activeTab === "videos" && nativeAndroid && (
          <div>
            <div className="video-toolbar">
              <div className="video-folder-info">
                <span className="video-folder-label">
                  {videoFolderName
                    ? strings.videoFolderStatus(videoFolderName, videos.length)
                    : strings.videoFolderNone}
                </span>
                <span className="video-folder-hint">{strings.videoFolderHint}</span>
              </div>

              <div className="video-toolbar-actions">
                {videos.length > 0 && (
                  <button
                    className="action-btn primary"
                    onClick={() => onPlayLocalVideo(0)}
                  >
                    <Play size={20} />
                    {strings.playAllVideos}
                  </button>
                )}
                {videoFolderName && (
                  <button
                    className="action-btn"
                    onClick={onRescanVideos}
                    disabled={videoLoading}
                  >
                    <RefreshCw size={20} />
                    {strings.rescan}
                  </button>
                )}
                <button
                  className="action-btn"
                  onClick={onPickVideoFolder}
                  disabled={videoLoading}
                >
                  <FolderOpen size={20} />
                  {videoFolderName ? strings.changeFolder : strings.pickFolder}
                </button>
              </div>
            </div>

            {videos.length === 0 ? (
              <div className="empty-video-state">
                <Film size={64} color="var(--accent)" />
                <h2>
                  {videoFolderName
                    ? strings.emptyVideoTitleEmpty
                    : strings.emptyVideoTitleNoFolder}
                </h2>
                <p>{strings.emptyVideoDesc}</p>
                <button
                  className="action-btn primary"
                  onClick={onPickVideoFolder}
                  disabled={videoLoading}
                >
                  <FolderOpen size={22} />
                  {videoLoading ? strings.loading : strings.pickFolder}
                </button>
              </div>
            ) : (
              <div className="book-grid">
                {videos.map((video, idx) => (
                  <article key={video.id} className="book-card">
                    <button
                      className="book-cover-btn"
                      onClick={() => onPlayLocalVideo(idx)}
                      aria-label={video.displayTitle}
                    >
                      {video.coverImage ? (
                        <img
                          className="book-cover-img"
                          src={video.coverImage}
                          alt={video.displayTitle}
                        />
                      ) : (
                        <div className="video-placeholder-cover">
                          <Film size={52} />
                        </div>
                      )}
                      <div className="video-play-overlay">
                        <div className="video-play-circle">
                          <Play size={28} fill="#fff" />
                        </div>
                      </div>
                    </button>
                    <div className="book-card-footer">
                      <span className="book-card-title">{video.displayTitle}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "videos" && !nativeAndroid && (
          <div>
            {YOUTUBE_VIDEOS.length === 0 ? (
              <div className="empty-video-state">
                <Film size={64} color="var(--accent)" />
                <h2>{strings.tabVideos}</h2>
                <p>{strings.ytComingSoon}</p>
              </div>
            ) : (
              <div className="book-grid">
                {YOUTUBE_VIDEOS.map((yt) => (
                  <article key={yt.id} className="book-card">
                    <button
                      className="book-cover-btn"
                      onClick={() => onPlayYouTubeVideo(yt)}
                      aria-label={yt.title[language]}
                    >
                      {yt.coverImage ? (
                        <img
                          className="book-cover-img"
                          src={yt.coverImage}
                          alt={yt.title[language]}
                        />
                      ) : (
                        <div className="video-placeholder-cover">
                          <Film size={52} />
                        </div>
                      )}
                      <div className="video-play-overlay">
                        <div className="video-play-circle">
                          <Play size={28} fill="#fff" />
                        </div>
                      </div>
                    </button>
                    <div className="book-card-footer">
                      <span className="book-card-title">{yt.title[language]}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
