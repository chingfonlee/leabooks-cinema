import { useEffect, useRef } from "react";
import { UI_STRINGS } from "../i18n";
import type { CinemaBook, LanguageCode } from "../types";
import { TheaterBottomDock } from "./TheaterBottomDock";

interface BookshelfViewProps {
  books: CinemaBook[];
  activeIndex: number;
  language: LanguageCode;
  musicMuted: boolean;
  onChangeIndex: (nextIndex: number) => void;
  onToggleMute: () => void;
  onOpenBook: (slug: string, autoplay: boolean) => void;
}

export function BookshelfView({
  books,
  activeIndex,
  language,
  musicMuted,
  onChangeIndex,
  onToggleMute,
  onOpenBook,
}: BookshelfViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Tracks which book was already selected before pointer/touch triggered focus,
  // so first click/tap on an unselected card selects it, and second click/tap opens it.
  const pointerDownSelectedRef = useRef<number | null>(null);

  const total = books.length;
  const strings = UI_STRINGS[language];
  const columnCount = Math.max(1, Math.ceil(total / 2));

  useEffect(() => {
    const container = scrollRef.current;
    const card = cardRefs.current[activeIndex];
    if (!container || !card) return;

    const cardLeft = card.offsetLeft;
    const cardRight = cardLeft + card.offsetWidth;
    const viewLeft = container.scrollLeft;
    const viewRight = viewLeft + container.clientWidth;
    const pad = 24;

    let targetLeft: number | null = null;
    if (cardLeft - pad < viewLeft) {
      targetLeft = Math.max(0, cardLeft - pad);
    } else if (cardRight + pad > viewRight) {
      targetLeft = cardRight + pad - container.clientWidth;
    }

    if (targetLeft !== null) {
      if (typeof container.scrollTo === "function") {
        try {
          container.scrollTo({ left: targetLeft, behavior: "smooth" });
        } catch {
          container.scrollLeft = targetLeft;
        }
      } else {
        container.scrollLeft = targetLeft;
      }
    }
  }, [activeIndex]);

  if (total === 0) return null;

  const handleCardPointerDown = () => {
    pointerDownSelectedRef.current = activeIndex;
  };

  const handleCardFocus = (idx: number) => {
    if (idx !== activeIndex) {
      onChangeIndex(idx);
    }
  };

  const handleCardClick = (book: CinemaBook, idx: number) => {
    const prevSelected = pointerDownSelectedRef.current;
    pointerDownSelectedRef.current = null;

    // Keyboard/TV-remote Enter/OK has prevSelected === null, so if focused & selected it opens immediately.
    // Mouse/touch click opens only if the card was already selected before the click started.
    const wasAlreadySelected =
      prevSelected === null ? idx === activeIndex : prevSelected === idx;

    if (wasAlreadySelected) {
      onOpenBook(book.slug, false);
    } else {
      onChangeIndex(idx);
    }
  };

  return (
    <section className="hero-carousel-wrap bookshelf-wrap" aria-label={strings.tabShelf}>
      <div className="bookshelf-stage">
        <div className="bookshelf-scroll" ref={scrollRef}>
          <div
            className="bookshelf-grid"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, var(--bookshelf-card-w, 500px))`,
            }}
          >
            {books.map((book, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={book.slug}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  type="button"
                  className={`bookshelf-card ${isSelected ? "selected" : ""}`}
                  data-autofocus={isSelected ? "true" : undefined}
                  aria-pressed={isSelected}
                  aria-label={`${String(book.order).padStart(2, "0")} ${book.title[language]}`}
                  onMouseDown={handleCardPointerDown}
                  onTouchStart={handleCardPointerDown}
                  onFocus={() => handleCardFocus(idx)}
                  onClick={() => handleCardClick(book, idx)}
                >
                  <div className="bookshelf-cover-box">
                    <img
                      className="bookshelf-cover-img"
                      src={book.coverImage}
                      alt={book.title[language]}
                      draggable={false}
                      loading="eager"
                    />
                    <span className="bookshelf-order-badge">
                      {String(book.order).padStart(2, "0")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <TheaterBottomDock
        books={books}
        activeIndex={activeIndex}
        language={language}
        musicMuted={musicMuted}
        onChangeIndex={onChangeIndex}
        onToggleMute={onToggleMute}
        onOpenBook={onOpenBook}
      />
    </section>
  );
}
