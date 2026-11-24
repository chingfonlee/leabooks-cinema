import { ArrowLeft } from "lucide-react";
import type { LanguageCode, YouTubeVideoItem } from "../types";
import { UI_STRINGS } from "../i18n";

interface YouTubePlayerModalProps {
  video: YouTubeVideoItem;
  language: LanguageCode;
  onExit: () => void;
}

export function YouTubePlayerModal({
  video,
  language,
  onExit,
}: YouTubePlayerModalProps) {
  const strings = UI_STRINGS[language];

  return (
    <div className="video-player-root">
      <div className="reader-top-bar">
        <div className="reader-top-left">
          <button className="reader-pill-btn" onClick={onExit}>
            <ArrowLeft size={22} />
            {strings.backToVideos}
          </button>
          <span className="reader-book-title">{video.title[language]}</span>
        </div>
      </div>

      <iframe
        className="youtube-iframe"
        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
        title={video.title[language]}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
