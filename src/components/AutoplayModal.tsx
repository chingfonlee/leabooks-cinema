import { useRef, useState } from "react";
import { CheckSquare, Play, Square, X } from "lucide-react";
import { UI_STRINGS } from "../i18n";
import type { CinemaBook, LanguageCode } from "../types";
import { useSpatialNavigation } from "../utils/tvNavigation";

interface AutoplayModalProps {
  books: CinemaBook[];
  language: LanguageCode;
  pageDurationSec: number;
  onClose: () => void;
  onStartAutoplay: (selectedSlugs: string[]) => void;
}

export function AutoplayModal({
  books,
  language,
  pageDurationSec,
  onClose,
  onStartAutoplay,
}: AutoplayModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  useSpatialNavigation(modalRef, true, onClose);

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() =>
    books.map((b) => b.slug),
  );
  const strings = UI_STRINGS[language];

  const toggleSlug = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const orderedSelection = books
    .filter((b) => selectedSlugs.includes(b.slug))
    .map((b) => b.slug);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{strings.autoplayModalTitle(pageDurationSec)}</h2>
          <button className="action-btn" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="action-btn"
              onClick={() => setSelectedSlugs(books.map((b) => b.slug))}
            >
              {strings.selectAll(books.length)}
            </button>
            <button className="action-btn" onClick={() => setSelectedSlugs([])}>
              {strings.clearAll}
            </button>
            <span style={{ color: "var(--text-secondary)", fontSize: 15 }}>
              {strings.selectedHint(orderedSelection.length)}
            </span>
          </div>

          <div className="playlist-grid">
            {books.map((book) => {
              const checked = selectedSlugs.includes(book.slug);
              return (
                <button
                  key={book.slug}
                  className={`playlist-item ${checked ? "selected" : ""}`}
                  onClick={() => toggleSlug(book.slug)}
                >
                  {checked ? (
                    <CheckSquare size={22} color="var(--accent)" />
                  ) : (
                    <Square size={22} color="var(--text-muted)" />
                  )}
                  <img
                    className="playlist-thumb"
                    src={book.coverImage}
                    alt={book.title[language]}
                  />
                  <span className="playlist-item-title">
                    {String(book.order).padStart(2, "0")}. {book.title[language]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="action-btn" onClick={onClose}>
            {strings.cancel}
          </button>
          <button
            className="action-btn primary"
            data-autofocus="true"
            disabled={orderedSelection.length === 0}
            style={{ opacity: orderedSelection.length === 0 ? 0.45 : 1 }}
            onClick={() => onStartAutoplay(orderedSelection)}
          >
            <Play size={20} />
            {strings.startPlaylist(orderedSelection.length)}
          </button>
        </div>
      </div>
    </div>
  );
}
