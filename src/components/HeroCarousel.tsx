import { useCallback, useEffect, useRef } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { CinemaBook, LanguageCode } from "../types";
import { UI_STRINGS } from "../i18n";

interface HeroCarouselProps {
  books: CinemaBook[];
  activeIndex: number;
  language: LanguageCode;
  pageDurationSec: number;
  keyboardActive: boolean;
  onChangeIndex: (nextIndex: number) => void;
  onOpenBook: (slug: string, autoplay: boolean) => void;
}

export function HeroCarousel({
  books,
  activeIndex,
  language,
  pageDurationSec,
  keyboardActive,
  onChangeIndex,
  onOpenBook,
}: HeroCarouselProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const strings = UI_STRINGS[language];
  const total = books.length;

  const goPrev = useCallback(() => {
    onChangeIndex((activeIndex - 1 + total) % total);
  }, [activeIndex, onChangeIndex, total]);

  const goNext = useCallback(() => {
    onChangeIndex((activeIndex + 1) % total);
  }, [activeIndex, onChangeIndex, total]);

  // Direct Left/Right infinite looping when the main cover is focused on TV remote
  useEffect(() => {
    if (!keyboardActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const inHeroCover = active?.getAttribute("data-hero-cover") === "true";
      if (!inHeroCover) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopImmediatePropagation();
        document.body.classList.add("tv-remote-mode");
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopImmediatePropagation();
        document.body.classList.add("tv-remote-mode");
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [goNext, goPrev, keyboardActive]);

  if (total === 0) return null;

  const currentBook = books[activeIndex] ?? books[0];

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
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.1) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  return (
    <section
      className="hero-carousel-wrap"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={strings.tabBooks}
    >
      {/* Full-detail, uncropped wide cover stage */}
      <div className="hero-cover-stage">
        <button
          className="hero-cover-frame"
          data-autofocus="true"
          data-hero-cover="true"
          onClick={() => onOpenBook(currentBook.slug, false)}
          aria-label={`${strings.btnStartReading} ${currentBook.title[language]}`}
        >
          <img
            key={currentBook.slug}
            className="hero-cover-full-img"
            src={currentBook.coverImage}
            alt={currentBook.title[language]}
            draggable={false}
          />
        </button>
      </div>

      {/* Unified bottom theater dock: [Prev] [Title + Summary] [Read + Autoplay] [Next] */}
      <div className="hero-bottom-dock">
        <button
          className="hero-nav-circle"
          onClick={goPrev}
          aria-label="Previous book"
        >
          <ChevronLeft size={30} />
        </button>

        <div className="hero-dock-meta" key={`${currentBook.slug}-${language}`}>
          <div className="hero-title-row">
            <span className="hero-order-tag">
              {String(currentBook.order).padStart(2, "0")} /{" "}
              {String(total).padStart(2, "0")}
            </span>
            <h1 className="hero-book-title">{currentBook.title[language]}</h1>
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
            {strings.btnAutoplayBook} ({pageDurationSec}s)
          </button>
        </div>

        <button
          className="hero-nav-circle"
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
    </section>
  );
}
