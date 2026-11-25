import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled]):not([tabindex='-1'])",
  "input:not([disabled]):not([tabindex='-1'])",
  "[tabindex='0']",
].join(", ");

export type NavDirection = "up" | "down" | "left" | "right";

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return nodes.filter((el) => {
    if (el.getAttribute("tabindex") === "-1") return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function isHorizontallyClippedInScrollContainer(
  el: HTMLElement,
  rect: DOMRect,
): boolean {
  const scrollParent = el.closest<HTMLElement>(".bookshelf-scroll");
  if (!scrollParent) return false;
  const sRect = scrollParent.getBoundingClientRect();
  return rect.right <= sRect.left + 8 || rect.left >= sRect.right - 8;
}

export function findNextFocusable(
  container: HTMLElement,
  current: HTMLElement | null,
  direction: NavDirection,
): HTMLElement | null {
  const candidates = getFocusableElements(container);
  if (candidates.length === 0) return null;
  if (!current || !container.contains(current)) {
    return candidates[0];
  }

  const curRect = current.getBoundingClientRect();
  const curCx = curRect.left + curRect.width / 2;
  const curCy = curRect.top + curRect.height / 2;
  const isHorizontal = direction === "left" || direction === "right";

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of candidates) {
    if (el === current) continue;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (isHorizontal) {
      // Strictly stay within the same horizontal band so reaching the left/right
      // edge of a row never jumps diagonally to header/dock/another row.
      const overlapY =
        Math.min(curRect.bottom, rect.bottom) - Math.max(curRect.top, rect.top);
      const maxH = Math.max(curRect.height, rect.height);
      const isSameRow =
        overlapY > 4 || Math.abs(cy - curCy) <= Math.max(24, maxH * 0.5);
      if (!isSameRow) continue;

      if (direction === "right") {
        if (rect.left < curRect.right - 8 && cx <= curCx + 8) continue;
        const edgeDistX = Math.max(0, rect.left - curRect.right);
        const score = edgeDistX + Math.abs(cy - curCy) * 2.5;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      } else {
        if (rect.right > curRect.left + 8 && cx >= curCx - 8) continue;
        const edgeDistX = Math.max(0, curRect.left - rect.right);
        const score = edgeDistX + Math.abs(cy - curCy) * 2.5;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }
    } else {
      // For vertical movement, skip cards scrolled completely outside the visible
      // horizontal viewport of the bookshelf so focus lands on a visible card.
      if (isHorizontallyClippedInScrollContainer(el, rect)) continue;

      if (direction === "down") {
        if (rect.top < curRect.bottom - 8 && cy <= curCy + Math.max(12, curRect.height * 0.35)) {
          continue;
        }
        const edgeDistY = Math.max(0, rect.top - curRect.bottom);
        const overlapX =
          Math.min(curRect.right, rect.right) - Math.max(curRect.left, rect.left);
        const edgeDistX =
          overlapX > 0
            ? 0
            : rect.left > curRect.right
              ? rect.left - curRect.right
              : curRect.left - rect.right;
        const score =
          edgeDistY * 2.4 +
          edgeDistX * 1.6 +
          Math.abs(cx - curCx) * (overlapX > 0 ? 0.15 : 0.35);
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      } else {
        if (rect.bottom > curRect.top + 8 && cy >= curCy - Math.max(12, curRect.height * 0.35)) {
          continue;
        }
        const edgeDistY = Math.max(0, curRect.top - rect.bottom);
        const overlapX =
          Math.min(curRect.right, rect.right) - Math.max(curRect.left, rect.left);
        const edgeDistX =
          overlapX > 0
            ? 0
            : rect.left > curRect.right
              ? rect.left - curRect.right
              : curRect.left - rect.right;
        const score =
          edgeDistY * 2.4 +
          edgeDistX * 1.6 +
          Math.abs(cx - curCx) * (overlapX > 0 ? 0.15 : 0.35);
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }
    }
  }

  return best;
}

export function focusElementForTv(el: HTMLElement | null): void {
  if (!el) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  // BookshelfView manages its own horizontal scroll container for .bookshelf-card
  if (el.classList.contains("bookshelf-card")) return;
  if (typeof el.scrollIntoView === "function") {
    try {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    } catch {
      el.scrollIntoView(false);
    }
  }
}

export function useSpatialNavigation(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onEscape?: () => void,
): void {
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const active = document.activeElement as HTMLElement | null;
    if (active && container.contains(active) && active !== document.body) {
      return;
    }

    const preferred = container.querySelector<HTMLElement>(
      "[data-autofocus='true']:not([disabled])",
    );
    const first = preferred ?? getFocusableElements(container)[0] ?? null;
    if (first) {
      first.focus({ preventScroll: true });
    }
  }, [containerRef, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (e.key === "Escape" && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key === "Select" || e.key === "Accept") {
        const active = document.activeElement as HTMLElement | null;
        if (active && container.contains(active)) {
          e.preventDefault();
          active.click();
        }
        return;
      }

      let dir: NavDirection | null = null;
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
        if (!e.isTrusted) {
          e.preventDefault();
          const min = Number(active.min || 0);
          const max = Number(active.max || 100);
          const step = Number(active.step || 5);
          const cur = Number(active.value || 0);
          const nextVal = Math.min(
            max,
            Math.max(min, cur + (dir === "right" ? step : -step)),
          );
          const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set;
          setter?.call(active, String(nextVal));
          active.dispatchEvent(new Event("input", { bubbles: true }));
          active.dispatchEvent(new Event("change", { bubbles: true }));
        }
        return;
      }

      e.preventDefault();
      document.body.classList.add("tv-remote-mode");

      const next = findNextFocusable(
        container,
        active && container.contains(active) ? active : null,
        dir,
      );
      if (next) {
        focusElementForTv(next);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, enabled, onEscape]);
}
