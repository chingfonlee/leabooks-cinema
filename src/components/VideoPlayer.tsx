import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { UI_STRINGS } from "../i18n";
import type { LanguageCode, LocalVideoItem } from "../types";
import { findNextFocusable, focusElementForTv } from "../utils/tvNavigation";

interface VideoPlayerProps {
  videos: LocalVideoItem[];
  initialIndex: number;
  language: LanguageCode;
  onExit: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function VideoPlayer({
  videos,
  initialIndex,
  language,
  onExit,
}: VideoPlayerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playBtnRef = useRef<HTMLButtonElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const strings = UI_STRINGS[language];
  const currentVideo = videos[index] ?? videos[0];

  const showControlsBriefly = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 4500);
  }, []);

  useEffect(() => {
    showControlsBriefly();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [index, showControlsBriefly]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [currentVideo?.playUrl]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
    showControlsBriefly();
  }, [showControlsBriefly]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % videos.length);
  }, [videos.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + videos.length) % videos.length);
  }, [videos.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isOk =
        e.key === "Enter" ||
        e.key === "NumpadEnter" ||
        e.key === "Select" ||
        e.key === "Accept";

      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
        return;
      }

      if (!controlsVisible) {
        if (isOk || e.key === " ") {
          e.preventDefault();
          togglePlay();
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.duration || 0,
              videoRef.current.currentTime + 10,
            );
          }
          showControlsBriefly();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
              0,
              videoRef.current.currentTime - 10,
            );
          }
          showControlsBriefly();
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          showControlsBriefly();
          window.requestAnimationFrame(() => {
            focusElementForTv(playBtnRef.current);
          });
        }
        return;
      }

      const container = rootRef.current;
      if (!container) return;

      if (e.key === "Select" || e.key === "Accept") {
        const active = document.activeElement as HTMLElement | null;
        if (active && container.contains(active)) {
          e.preventDefault();
          active.click();
        }
        return;
      }

      let dir: "up" | "down" | "left" | "right" | null = null;
      if (e.key === "ArrowUp") dir = "up";
      else if (e.key === "ArrowDown") dir = "down";
      else if (e.key === "ArrowLeft") dir = "left";
      else if (e.key === "ArrowRight") dir = "right";

      if (!dir) return;

      const active = document.activeElement as HTMLElement | null;
      if (
        active instanceof HTMLInputElement &&
        active.type === "range" &&
        (dir === "left" || dir === "right")
      ) {
        showControlsBriefly();
        return;
      }

      e.preventDefault();
      showControlsBriefly();
      const next = findNextFocusable(
        container,
        active && container.contains(active) ? active : null,
        dir,
      );
      if (next) focusElementForTv(next);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controlsVisible, onExit, showControlsBriefly, togglePlay]);

  if (!currentVideo) return null;

  return (
    <div ref={rootRef} className="video-player-root" onClick={showControlsBriefly}>
      <video
        ref={videoRef}
        className="video-element"
        src={currentVideo.playUrl}
        muted={muted}
        playsInline
        autoPlay
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={goNext}
      />

      <div
        className={`reader-top-bar ${controlsVisible ? "" : "hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reader-top-left">
          <button className="reader-pill-btn" onClick={onExit}>
            <ArrowLeft size={20} />
            {strings.backToVideos}
          </button>
          <div className="reader-title-block">
            <span className="reader-book-title">{currentVideo.displayTitle}</span>
            <span className="reader-page-counter">
              {index + 1} / {videos.length}
            </span>
          </div>
        </div>
      </div>

      <div
        className={`video-bottom-bar ${controlsVisible ? "" : "hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="video-seek-row">
          <input
            className="video-seek-slider"
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={(e) => {
              const t = Number(e.target.value);
              setCurrentTime(t);
              if (videoRef.current) videoRef.current.currentTime = t;
              showControlsBriefly();
            }}
          />
          <span className="video-time-label">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="video-controls-row">
          <div style={{ display: "flex", gap: 12 }}>
            {videos.length > 1 && (
              <button
                className="reader-pill-btn"
                onClick={() => {
                  goPrev();
                  showControlsBriefly();
                }}
              >
                <SkipBack size={18} />
                {strings.prevVideo}
              </button>
            )}
            <button
              ref={playBtnRef}
              className="reader-pill-btn active"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
              {playing ? strings.pause : strings.play}
            </button>
            {videos.length > 1 && (
              <button
                className="reader-pill-btn"
                onClick={() => {
                  goNext();
                  showControlsBriefly();
                }}
              >
                <SkipForward size={18} />
                {strings.nextVideo}
              </button>
            )}
          </div>

          <button
            className="reader-pill-btn"
            onClick={() => {
              setMuted((m) => !m);
              showControlsBriefly();
            }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            {muted ? strings.muted : strings.sound}
          </button>
        </div>
      </div>
    </div>
  );
}
