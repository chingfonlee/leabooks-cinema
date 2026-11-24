import { useEffect, useMemo, useState } from "react";
import type { CinemaBook } from "../types";

interface TiltedStoryWallProps {
  book: CinemaBook;
}

const SAMPLE_PAGE_INDICES = [2, 4, 7, 10, 13, 15]; // Pages 3, 5, 8, 11, 14, 16

function pickThumbnails(book: CinemaBook): string[] {
  const picked: string[] = [];
  for (const idx of SAMPLE_PAGE_INDICES) {
    const page = book.pages[idx];
    if (page?.image) picked.push(page.image);
  }
  if (picked.length === 0 && book.coverImage) {
    picked.push(book.coverImage);
  }
  return picked;
}

function StoryWallLayer({
  book,
  fadingOut,
}: {
  book: CinemaBook;
  fadingOut: boolean;
}) {
  const thumbs = useMemo(() => pickThumbnails(book), [book]);
  const row1 = useMemo(() => [...thumbs, ...thumbs], [thumbs]);
  const row2 = useMemo(() => {
    const shifted = [...thumbs.slice(2), ...thumbs.slice(0, 2)];
    return [...shifted, ...shifted];
  }, [thumbs]);
  const row3 = useMemo(() => {
    const shifted = [...thumbs.slice(4), ...thumbs.slice(0, 4)];
    return [...shifted, ...shifted];
  }, [thumbs]);

  return (
    <div
      className={`story-wall-layer ${fadingOut ? "fading-out" : "fading-in"}`}
      aria-hidden="true"
    >
      <div className="story-wall-tilt">
        <div className="story-wall-row">
          <div className="story-wall-track track-left-fast">
            {row1.map((src, i) => (
              <img
                key={`r1-${i}`}
                className="story-wall-thumb"
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ))}
          </div>
        </div>

        <div className="story-wall-row">
          <div className="story-wall-track track-right-slow">
            {row2.map((src, i) => (
              <img
                key={`r2-${i}`}
                className="story-wall-thumb"
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ))}
          </div>
        </div>

        <div className="story-wall-row story-wall-row-third">
          <div className="story-wall-track track-left-medium">
            {row3.map((src, i) => (
              <img
                key={`r3-${i}`}
                className="story-wall-thumb"
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TiltedStoryWall({ book }: TiltedStoryWallProps) {
  const [activeBook, setActiveBook] = useState<CinemaBook>(book);
  const [exitingBook, setExitingBook] = useState<CinemaBook | null>(null);

  // Debounce rapid book switching by 200ms, then crossfade cleanly
  useEffect(() => {
    if (book.slug === activeBook.slug) return;
    const debounce = window.setTimeout(() => {
      setExitingBook(activeBook);
      setActiveBook(book);
    }, 200);
    return () => window.clearTimeout(debounce);
  }, [book, activeBook]);

  useEffect(() => {
    if (!exitingBook) return;
    const cleanup = window.setTimeout(() => {
      setExitingBook(null);
    }, 680);
    return () => window.clearTimeout(cleanup);
  }, [exitingBook]);

  return (
    <div className="story-wall-backdrop" aria-hidden="true">
      {exitingBook && (
        <StoryWallLayer key={`exit-${exitingBook.slug}`} book={exitingBook} fadingOut />
      )}
      <StoryWallLayer key={`active-${activeBook.slug}`} book={activeBook} fadingOut={false} />
      <div className="story-wall-vignette" />
    </div>
  );
}
