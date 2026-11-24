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

  // Direct Left/Right looping when Hero stage or cover is focused (makes TV remote browsing effortless!)
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

  const prevBook = books[(activeIndex - 1 + total) % total];
  const currentBook = books[activeIndex] ?? books[0];
  const nextBook = books[(activeIndex + 1) % total];

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
      {/* Main 3-poster infinite circular stage */}
      <div className="hero-stage-row">
        <button
          className="hero-side-card hero-side-left"
          onClick={goPrev}
          aria-label={prevBook.title[language]}
          tabIndex={-1}
        >
          <img
            className="hero-side-img"
            src={prevBook.coverImage}
            alt={prevBook.title[language]}
          />
          <span className="hero-side-arrow">
            <ChevronLeft size={36} />
          </span>
        </button>

        <button
          className="hero-center-card"
          data-autofocus="true"
          data-hero-cover="true"
          onClick={() => onOpenBook(currentBook.slug, false)}
          aria-label={`${strings.btnStartReading} ${currentBook.title[language]}`}
        >
          <img
            key={currentBook.slug}
            className="hero-center-img"
            src={currentBook.coverImage}
            alt={currentBook.title[language]}
          />
          <span className="hero-order-pill">
            {String(currentBook.order).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </button>

        <button
          className="hero-side-card hero-side-right"
          onClick={goNext}
          aria-label={nextBook.title[language]}
          tabIndex={-1}
        >
          <img
            className="hero-side-img"
            src={nextBook.coverImage}
            alt={nextBook.title[language]}
          />
          <span className="hero-side-arrow">
            <ChevronRight size={36} />
          </span>
        </button>
      </div>

      {/* Below-cover Book Summary & Theater Actions */}
      <div className="hero-info-panel" key={`${currentBook.slug}-${language}`}>
        <div className="hero-title-row">
          <h1 className="hero-book-title">{currentBook.title[language]}</h1>
          <span className="hero-page-badge">
            {currentBook.pageCount} {strings.pagesUnit}
          </span>
        </div>

        <p className="hero-book-summary">{currentBook.summary[language]}</p>

        <div className="hero-cta-row">
          <button
            className="action-btn primary hero-cta-btn"
            onClick={() => onOpenBook(currentBook.slug, false)}
          >
            <BookOpen size={22} />
            {strings.btnStartReading}
          </button>
          <button
            className="action-btn hero-cta-btn"
            onClick={() => onOpenBook(currentBook.slug, true)}
          >
            <Play size={20} />
            {strings.btnAutoplayBook} ({pageDurationSec}s)
          </button>
        </div>

        {/* Circular indicator dots */}
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
        <div className="hero-hint-text">{strings.carouselHint}</div>
      </div>
    </section>
  );
}
