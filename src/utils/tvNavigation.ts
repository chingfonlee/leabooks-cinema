import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "[tabindex='0']",
].join(", ");

export type NavDirection = "up" | "down" | "left" | "right";

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return nodes.filter((el) => {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
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

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of candidates) {
    if (el === current) continue;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = cx - curCx;
    const dy = cy - curCy;

    let primary = 0;
    let secondary = 0;

    if (direction === "right") {
      if (dx <= 4) continue;
      primary = dx;
      secondary = Math.abs(dy);
    } else if (direction === "left") {
      if (dx >= -4) continue;
      primary = -dx;
      secondary = Math.abs(dy);
    } else if (direction === "down") {
      if (dy <= 4) continue;
      primary = dy;
      secondary = Math.abs(dx);
    } else if (direction === "up") {
      if (dy >= -4) continue;
      primary = -dy;
      secondary = Math.abs(dx);
    }

    const score = primary + secondary * 2.6;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }

  return best;
}

export function focusElementForTv(el: HTMLElement | null): void {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
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
