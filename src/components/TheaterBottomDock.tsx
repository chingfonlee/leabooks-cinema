import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { UI_STRINGS } from "../i18n";
import type { CinemaBook, LanguageCode } from "../types";

interface TheaterBottomDockProps {
  books: CinemaBook[];
  activeIndex: number;
  language: LanguageCode;
  musicMuted: boolean;
  onChangeIndex: (nextIndex: number) => void;
  onToggleMute: () => void;
  onOpenBook: (slug: string, autoplay: boolean) => void;
}

export function TheaterBottomDock({
  books,
  activeIndex,
  language,
  musicMuted,
  onChangeIndex,
  onToggleMute,
  onOpenBook,
}: TheaterBottomDockProps) {
  const total = books.length;
  if (total === 0) return null;

  const strings = UI_STRINGS[language];
  const currentBook = books[activeIndex] ?? books[0];

  const goPrev = () => {
    onChangeIndex((activeIndex - 1 + total) % total);
  };

  const goNext = () => {
    onChangeIndex((activeIndex + 1) % total);
  };

  return (
    <>
      {/* Unified bottom theater dock: [Prev] [Title + Summary] [Read + Autoplay] [Next] */}
      <div className="hero-bottom-dock">
        <button
          className="hero-nav-circle hero-nav-prev"
          onClick={goPrev}
          aria-label="Previous book"
        >
          <ChevronLeft size={30} />
        </button>

        <div className="hero-dock-meta" key={`${currentBook.slug}-${language}`}>
          <div className="hero-title-row">
            <h1 className="hero-book-title">{currentBook.title[language]}</h1>
            <span className="hero-order-tag">
              {String(currentBook.order).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </span>
          </div>
          <p className="hero-book-summary">{currentBook.summary[language]}</p>
        </div>

        <div className="hero-dock-actions">
          <button
            className="action-btn primary hero-cta-btn"
            onClick={() => onOpenBook(currentBook.slug, false)}
          >
            <BookOpen size={20} />
            {strings.btnStartReading}
          </button>
          <button
            className="action-btn hero-cta-btn"
            onClick={() => onOpenBook(currentBook.slug, true)}
          >
            <Play size={18} />
            {strings.btnAutoplayBook}
          </button>
          <button
            className={`hero-mute-btn ${musicMuted ? "muted" : ""}`}
            onClick={onToggleMute}
            aria-label={musicMuted ? strings.muted : strings.music}
            title={musicMuted ? strings.muted : strings.music}
          >
            {musicMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        <button
          className="hero-nav-circle hero-nav-next"
          onClick={goNext}
          aria-label="Next book"
        >
          <ChevronRight size={30} />
        </button>
      </div>

      {/* Compact indicator dots */}
      <div className="hero-dots-row" role="tablist" aria-label="Book selector">
        {books.map((book, idx) => (
          <button
            key={book.slug}
            className={`hero-dot ${idx === activeIndex ? "active" : ""}`}
            onClick={() => onChangeIndex(idx)}
            aria-label={book.title[language]}
            aria-selected={idx === activeIndex}
            tabIndex={-1}
          />
        ))}
      </div>
    </>
  );
}
