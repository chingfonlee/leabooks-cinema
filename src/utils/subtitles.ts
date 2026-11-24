import type { LanguageCode } from "../types";

export interface SubtitleSegment {
  text: string;
  startMs: number;
  endMs: number;
}

const MIN_SEGMENT_DURATION_MS = 2200;

/**
 * Compute comfortable autoplay page duration (seconds) based on page index and character count:
 * - Pages 1-2 (cover & title intro): always 5s
 * - Pages 3+: base 3s + reading pace (~11 zh chars/s or ~22 latin chars/s), clamped to 5..35s
 */
export function computeSmartPageDurationSec(
  rawText: string,
  pageIndex: number,
  lang: LanguageCode = "zh",
): number {
  if (pageIndex < 2) return 5;
  const compact = rawText.replace(/\s+/g, "").trim();
  if (!compact) return 5;

  const charsPerSec = lang === "zh" ? 11 : 22;
  const estimated = Math.round(3 + compact.length / charsPerSec);
  return Math.max(5, Math.min(35, estimated));
}

function splitLatinSentence(sentence: string, maxChars: number): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let acc = "";
  for (const w of words) {
    if (acc && acc.length + 1 + w.length > maxChars) {
      out.push(acc);
      acc = w;
    } else {
      acc = acc ? `${acc} ${w}` : w;
    }
  }
  if (acc) out.push(acc);
  return out;
}

/**
 * Split Traditional Chinese, English, or Czech picture-book text into cinema-style
 * 2-3 line chunks and allocate timing proportionally across `totalDurationMs`.
 */
export function buildSubtitleSegments(
  rawText: string,
  totalDurationMs: number,
  lang: LanguageCode = "zh",
): SubtitleSegment[] {
  const cleaned = rawText.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  const maxChars = lang === "zh" ? 58 : 115;

  const paragraphs = cleaned
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const sentences: string[] = [];
  for (const para of paragraphs) {
    if (lang === "zh") {
      const parts = para.match(/[^。！？!?；;…]+(?:[。！？!?；;…]+[」』”"）)]*)?/g);
      if (!parts) {
        sentences.push(para);
        continue;
      }
      for (const part of parts) {
        const s = part.trim();
        if (!s) continue;
        if (s.length <= maxChars) {
          sentences.push(s);
        } else {
          const subParts = s.match(/[^，、,：:]+(?:[，、,：:]+)?/g) ?? [s];
          let acc = "";
          for (const sub of subParts) {
            if (acc && acc.length + sub.length > maxChars) {
              sentences.push(acc.trim());
              acc = sub;
            } else {
              acc += sub;
            }
          }
          if (acc.trim()) sentences.push(acc.trim());
        }
      }
    } else {
      // English / Czech sentence splitting on . ! ? ;
      const parts = para.match(/[^.!?;…]+(?:[.!?;…]+["”»)\]]*)?/g) ?? [para];
      for (const part of parts) {
        const s = part.trim();
        if (!s) continue;
        if (s.length <= maxChars) {
          sentences.push(s);
        } else {
          sentences.push(...splitLatinSentence(s, maxChars));
        }
      }
    }
  }

  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
    } else if (current.length + sentence.length + 1 <= maxChars) {
      current = `${current} ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);

  if (chunks.length === 0) return [];
  if (chunks.length === 1) {
    return [{ text: chunks[0], startMs: 0, endMs: totalDurationMs }];
  }

  const weights = chunks.map((c) => Math.max(c.length, 8));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const rawDurations = weights.map((w) => (w / totalWeight) * totalDurationMs);
  const effectiveMin = Math.min(MIN_SEGMENT_DURATION_MS, totalDurationMs / chunks.length);

  const clamped = rawDurations.map((d) => Math.max(d, effectiveMin));
  const clampedSum = clamped.reduce((a, b) => a + b, 0);
  const scale = totalDurationMs / clampedSum;

  const segments: SubtitleSegment[] = [];
  let cursor = 0;
  for (let i = 0; i < chunks.length; i++) {
    const dur = clamped[i] * scale;
    const end = i === chunks.length - 1 ? totalDurationMs : Math.round(cursor + dur);
    segments.push({
      text: chunks[i],
      startMs: Math.round(cursor),
      endMs: end,
    });
    cursor = end;
  }

  return segments;
}

export function getSegmentIndexAtTime(
  segments: SubtitleSegment[],
  elapsedMs: number,
): number {
  if (segments.length <= 1) return 0;
  for (let i = 0; i < segments.length; i++) {
    if (elapsedMs < segments[i].endMs) return i;
  }
  return segments.length - 1;
}
