import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { LANGUAGE_SHORT, UI_STRINGS } from "../i18n";
import type { AppSettings, CinemaBook, LanguageCode } from "../types";
import {
  buildSubtitleSegments,
  computeSmartPageDurationSec,
  getSegmentIndexAtTime,
} from "../utils/subtitles";
import { findNextFocusable, focusElementForTv } from "../utils/tvNavigation";

interface BookReaderProps {
  playlist: CinemaBook[];
  initialBookIndex?: number;
  initialAutoplay: boolean;
  settings: AppSettings;
  onLanguageChange: (lang: LanguageCode) => void;
  onToggleMute: () => void;
  onExit: () => void;
}

const LANGS: LanguageCode[] = ["zh", "en", "cs"];

export function BookReader({
  playlist,
  initialBookIndex = 0,
  initialAutoplay,
  settings,
  onLanguageChange,
  onToggleMute,
  onExit,
}: BookReaderProps) {
  const [bookIdx, setBookIdx] = useState(initialBookIndex);
  const [pageIdx, setPageIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(initialAutoplay);
  const [autoResumeArmed, setAutoResumeArmed] = useState(initialAutoplay);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [manualSegIdx, setManualSegIdx] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [idleRemainingSec, setIdleRemainingSec] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const autoplayBtnRef = useRef<HTMLButtonElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const controlsTimerRef = useRef<number | null>(null);

  const lang = settings.language;
  const strings = UI_STRINGS[lang];
  const currentBook = playlist[bookIdx] ?? playlist[0];
  const currentPage = currentBook.pages[pageIdx] ?? currentBook.pages[0];
  const currentPageDurationSec =
    settings.pageDurationSec === 0
      ? computeSmartPageDurationSec(currentPage.text[lang], pageIdx, lang)
      : pageIdx < 2
        ? 5
        : settings.pageDurationSec;
  const pageDurationMs = currentPageDurationSec * 1000;

  const segments = useMemo(() => {
    const raw = currentPage.text[lang];
    const text =
      raw ||
      (currentPage.page === 1
        ? lang === "zh"
          ? `《${currentBook.title.zh}》`
          : currentBook.title[lang]
        : "");
    return buildSubtitleSegments(text, pageDurationMs, lang);
  }, [currentPage.text, currentPage.page, currentBook.title, pageDurationMs, lang]);

  const activeSegIdx = isAutoPlaying
    ? getSegmentIndexAtTime(segments, elapsedMs)
    : Math.min(manualSegIdx, Math.max(segments.length - 1, 0));

  const currentSubtitle = segments[activeSegIdx]?.text ?? "";

  useEffect(() => {
    const nextPage = currentBook.pages[pageIdx + 1];
    if (nextPage) {
      const img = new Image();
      img.src = nextPage.image;
    }
  }, [currentBook, pageIdx]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = settings.musicMuted ? 0 : settings.musicVolume;
    audio.muted = settings.musicMuted;
    if (!settings.musicMuted) {
      audio.play().catch(() => {});
    }
  }, [currentBook.musicSrc, settings.musicMuted, settings.musicVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) audio.pause();
    };
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    };
  }, []);

  const noteUserInteraction = useCallback(
    (pauseIfAuto: boolean) => {
      lastActivityRef.current = Date.now();
      if (audioRef.current && !settings.musicMuted && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
      if (pauseIfAuto && isAutoPlaying) {
        setIsAutoPlaying(false);
        setAutoResumeArmed(true);
      }
      if (settings.idleResumeSec > 0) {
        setIdleRemainingSec(settings.idleResumeSec);
      }
    },
    [isAutoPlaying, settings.idleResumeSec, settings.musicMuted],
  );

  const goToNextPage = useCallback(
    (fromAutoplay: boolean) => {
      if (!fromAutoplay) noteUserInteraction(true);
      setElapsedMs(0);
      setManualSegIdx(0);

      if (pageIdx < currentBook.pages.length - 1) {
        setPageIdx((p) => p + 1);
      } else if (playlist.length > 1) {
        setBookIdx((b) => (b + 1) % playlist.length);
        setPageIdx(0);
      } else {
        setPageIdx(0);
      }
    },
    [currentBook.pages.length, noteUserInteraction, pageIdx, playlist.length],
  );

  const goToPrevPage = useCallback(() => {
    noteUserInteraction(true);
    setElapsedMs(0);
    setManualSegIdx(0);

    if (pageIdx > 0) {
      setPageIdx((p) => p - 1);
    } else if (playlist.length > 1) {
      const prevBookIdx = (bookIdx - 1 + playlist.length) % playlist.length;
      setBookIdx(prevBookIdx);
      setPageIdx(playlist[prevBookIdx].pages.length - 1);
    }
  }, [bookIdx, noteUserInteraction, pageIdx, playlist]);

  const goToNextBook = useCallback(() => {
    noteUserInteraction(false);
    setElapsedMs(0);
    setManualSegIdx(0);
    setBookIdx((b) => (b + 1) % playlist.length);
    setPageIdx(0);
  }, [noteUserInteraction, playlist.length]);

  useEffect(() => {
    if (!isAutoPlaying) return;
    let lastTick = performance.now();

    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - lastTick;
      lastTick = now;

      setElapsedMs((prev) => {
        const next = prev + delta;
        if (next >= pageDurationMs) {
          goToNextPage(true);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [isAutoPlaying, pageDurationMs, goToNextPage]);

  useEffect(() => {
    if (isAutoPlaying || !autoResumeArmed || settings.idleResumeSec <= 0) {
      setIdleRemainingSec(null);
      return;
    }

    const timer = window.setInterval(() => {
      const idleSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remain = settings.idleResumeSec - idleSec;
      if (remain <= 0) {
        setIdleRemainingSec(null);
        setElapsedMs(0);
        setIsAutoPlaying(true);
      } else {
        setIdleRemainingSec(remain);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isAutoPlaying, autoResumeArmed, settings.idleResumeSec]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isOk =
        e.key === "Enter" ||
        e.key === "NumpadEnter" ||
        e.key === "Select" ||
        e.key === "Accept";

      if (controlsVisible && topBarRef.current) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          showControlsTemporarily();
          const active = document.activeElement as HTMLElement | null;
          const next = findNextFocusable(
            topBarRef.current,
            active && topBarRef.current.contains(active) ? active : null,
            e.key === "ArrowLeft" ? "left" : "right",
          );
          if (next) focusElementForTv(next);
          return;
        }
        if (e.key === "ArrowDown" || e.key === "Escape") {
          e.preventDefault();
          setControlsVisible(false);
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          return;
        }
        if (isOk) {
          const active = document.activeElement as HTMLElement | null;
          if (active && topBarRef.current.contains(active)) {
            if (e.key === "Select" || e.key === "Accept") {
              e.preventDefault();
              active.click();
            }
            return;
          }
        }
      }

      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNextPage(false);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        noteUserInteraction(true);
        if (segments.length > 1) {
          setManualSegIdx((prev) => (prev + 1) % segments.length);
        }
      } else if (e.key === "ArrowUp" || isOk) {
        e.preventDefault();
        noteUserInteraction(false);
        showControlsTemporarily();
        window.requestAnimationFrame(() => {
          focusElementForTv(autoplayBtnRef.current);
        });
      } else if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    controlsVisible,
    goToNextPage,
    goToPrevPage,
    noteUserInteraction,
    onExit,
    segments.length,
    showControlsTemporarily,
  ]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    const end = e.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !end) return;

    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) goToNextPage(false);
      else goToPrevPage();
    }
  };

  const handleSubtitleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    noteUserInteraction(true);
    if (segments.length > 1) {
      setManualSegIdx((prev) => (prev + 1) % segments.length);
    }
  };

  const handleToggleAutoplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    lastActivityRef.current = Date.now();
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      setAutoResumeArmed(false);
    } else {
      setElapsedMs(0);
      setAutoResumeArmed(true);
      setIsAutoPlaying(true);
    }
    showControlsTemporarily();
  };

  const progressPercent = isAutoPlaying
    ? Math.min(100, (elapsedMs / pageDurationMs) * 100)
    : 0;

  return (
    <div
      className={`reader-root ${controlsVisible ? "controls-visible" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        noteUserInteraction(false);
        if (controlsVisible) {
          if (controlsTimerRef.current) {
            window.clearTimeout(controlsTimerRef.current);
          }
          setControlsVisible(false);
        } else {
          showControlsTemporarily();
        }
      }}
    >
      {currentBook.musicSrc && (
        <audio
          key={currentBook.musicSrc}
          ref={audioRef}
          src={currentBook.musicSrc}
          loop
          preload="auto"
        />
      )}

      <div
        ref={topBarRef}
        className={`reader-top-bar ${controlsVisible ? "" : "hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reader-top-left">
          <button className="reader-pill-btn" onClick={onExit}>
            <ArrowLeft size={20} />
            {strings.backToShelf}
          </button>
          <div className="reader-title-block">
            <span className="reader-book-title">{currentBook.title[lang]}</span>
            <span className="reader-page-counter">
              {strings.pageCounter(pageIdx + 1, currentBook.pages.length)}
            </span>
          </div>
        </div>

        <div className="reader-top-right">
          <div className="lang-switcher compact" role="group" aria-label="Language">
            {LANGS.map((code) => (
              <button
                key={code}
                className={`lang-pill ${lang === code ? "active" : ""}`}
                onClick={() => {
                  onLanguageChange(code);
                  showControlsTemporarily();
                }}
              >
                {LANGUAGE_SHORT[code]}
              </button>
            ))}
          </div>

          {playlist.length > 1 && (
            <button className="reader-pill-btn" onClick={goToNextBook}>
              <SkipForward size={18} />
              {strings.nextBook} ({bookIdx + 1}/{playlist.length})
            </button>
          )}
          <button
            ref={autoplayBtnRef}
            className={`reader-pill-btn ${isAutoPlaying ? "active" : ""}`}
            onClick={handleToggleAutoplay}
          >
            {isAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isAutoPlaying
              ? strings.autoplaying(currentPageDurationSec)
              : strings.startAutoplay}
          </button>
          <button
            className="reader-pill-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
              showControlsTemporarily();
            }}
          >
            {settings.musicMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            {settings.musicMuted ? strings.muted : strings.music}
          </button>
        </div>
      </div>

      {!isAutoPlaying && idleRemainingSec !== null && (
        <div className="mode-status-badge">
          {strings.manualIdleHint(idleRemainingSec)}
        </div>
      )}

      <button
        className="touch-zone-left"
        aria-label="Previous page"
        onClick={(e) => {
          e.stopPropagation();
          goToPrevPage();
        }}
      >
        <span className="edge-arrow-pill">
          <ChevronLeft size={34} />
        </span>
      </button>

      <button
        className="touch-zone-right"
        aria-label="Next page"
        onClick={(e) => {
          e.stopPropagation();
          goToNextPage(false);
        }}
      >
        <span className="edge-arrow-pill">
          <ChevronRight size={34} />
        </span>
      </button>

      <div className="reader-stage">
        <img
          key={`${currentBook.slug}-${currentPage.page}`}
          className="reader-artwork"
          src={currentPage.image}
          alt={`${currentBook.title[lang]} ${currentPage.page}`}
          draggable={false}
        />
      </div>

      {currentSubtitle && (
        <div className="cinema-subtitle-wrap" onClick={handleSubtitleTap}>
          <p
            key={`${currentBook.slug}-${currentPage.page}-${activeSegIdx}-${lang}`}
            className={`cinema-subtitle-text ${lang !== "zh" ? "latin" : ""}`}
          >
            {currentSubtitle}
          </p>
          {segments.length > 1 && (
            <div className="subtitle-dots" aria-hidden="true">
              {segments.map((_, idx) => (
                <span
                  key={idx}
                  className={`subtitle-dot ${idx === activeSegIdx ? "active" : ""}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtle mobile-only bottom edge page-turn arrows */}
      <div
        className="mobile-reader-nav-hint"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="mobile-nav-arrow-btn"
          aria-label="Previous page"
          onClick={goToPrevPage}
        >
          <ChevronLeft size={18} />
        </button>
        <span className="mobile-nav-page-num">
          {pageIdx + 1} / {currentBook.pages.length}
        </span>
        <button
          className="mobile-nav-arrow-btn"
          aria-label="Next page"
          onClick={() => goToNextPage(false)}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {isAutoPlaying && (
        <div className="autoplay-progress-track" aria-hidden="true">
          <div
            className="autoplay-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
