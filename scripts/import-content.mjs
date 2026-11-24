import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const sourceRoot = process.env.LEAQRBOOK_ROOT
  ? path.resolve(process.env.LEAQRBOOK_ROOT)
  : path.resolve(projectRoot, "..", "LeaQRbook");

const sourceBooksTs = path.join(sourceRoot, "src", "data", "books.ts");
const sourceAssetsRoot = fs.existsSync(path.join(sourceRoot, "public", "books"))
  ? path.join(sourceRoot, "public", "books")
  : path.join(sourceRoot, "dist", "books");
const sourceAboutDir = path.join(sourceRoot, "docs", "about");
const sourceLogoPath = path.join(sourceRoot, "docs", "logo.jpg");

const customMusicDir = path.join(projectRoot, "custom-music");
const themeSongsDir = path.join(projectRoot, "music", "songs");
const targetPublicBooks = path.join(projectRoot, "public", "books");
const targetSharedAudio = path.join(targetPublicBooks, "_shared");
const targetSongsDir = path.join(targetPublicBooks, "_songs");
const targetLogoPath = path.join(projectRoot, "public", "logo.jpg");
const targetBooksJson = path.join(projectRoot, "src", "data", "books.generated.json");
const targetAboutJson = path.join(projectRoot, "src", "data", "about.generated.json");

if (!fs.existsSync(sourceBooksTs)) {
  console.error(`Source books.ts not found: ${sourceBooksTs}`);
  process.exit(1);
}
if (!fs.existsSync(sourceAssetsRoot)) {
  console.error(`Source book assets directory not found: ${sourceAssetsRoot}`);
  process.exit(1);
}

// 1. Copy Mingyang High School logo
if (fs.existsSync(sourceLogoPath)) {
  fs.mkdirSync(path.dirname(targetLogoPath), { recursive: true });
  fs.copyFileSync(sourceLogoPath, targetLogoPath);
}

// 2. Parse source books.ts
const rawTs = fs.readFileSync(sourceBooksTs, "utf8");
const match = rawTs.match(/export const books = (\[[\s\S]*?\]) satisfies Book\[\];/);
if (!match) {
  console.error("Failed to parse books array from source books.ts");
  process.exit(1);
}

const sourceBooks = JSON.parse(match[1]);
sourceBooks.sort((a, b) =>
  String(a.sourceName || a.slug).localeCompare(String(b.sourceName || b.slug), "zh-Hant", {
    numeric: true,
  }),
);

fs.rmSync(targetPublicBooks, { recursive: true, force: true });
fs.mkdirSync(targetSharedAudio, { recursive: true });
fs.mkdirSync(targetSongsDir, { recursive: true });
fs.mkdirSync(path.dirname(targetBooksJson), { recursive: true });

function normalizeMatchKey(input) {
  return String(input ?? "")
    .replace(/\.mp3$/i, "")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .toLowerCase()
    .trim();
}

function probeAudioDurationSec(filePath) {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    const val = Number.parseFloat(out);
    if (Number.isFinite(val) && val > 0) {
      return Math.round(val * 100) / 100;
    }
  } catch {
    // ffprobe unavailable; runtime onLoadedMetadata will act as fallback
  }
  return null;
}

const themeSongMap = new Map();
if (fs.existsSync(themeSongsDir)) {
  for (const entry of fs.readdirSync(themeSongsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".mp3")) continue;
    const key = normalizeMatchKey(entry.name);
    if (key) {
      themeSongMap.set(key, path.join(themeSongsDir, entry.name));
    }
  }
}

function buildFallbackSummary(pages, lang) {
  for (const p of pages) {
    const raw = String(p.text?.[lang] ?? "").replace(/\s+/g, " ").trim();
    if (raw.length >= 16) {
      const limit = lang === "zh" ? 68 : 135;
      return raw.length > limit ? `${raw.slice(0, limit).trim()}…` : raw;
    }
  }
  return "";
}

function findCustomAudio(slug, titleZh) {
  if (!fs.existsSync(customMusicDir)) return null;
  const candidates = [
    path.join(customMusicDir, `${slug}.mp3`),
    path.join(customMusicDir, `${titleZh}.mp3`),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  return null;
}

const audioHashToPath = new Map();
let totalCopiedImages = 0;
let totalCopiedAudio = 0;
let totalMatchedSongs = 0;
const matchedSongLogs = [];

const cinemaBooks = sourceBooks.map((book, index) => {
  const slug = book.slug;
  const srcBookDir = path.join(sourceAssetsRoot, slug);
  const dstBookDir = path.join(targetPublicBooks, slug);
  fs.mkdirSync(dstBookDir, { recursive: true });

  const pages = book.pages.map((p) => {
    const fileName = path.basename(p.image);
    const srcImg = path.join(srcBookDir, fileName);
    const dstImg = path.join(dstBookDir, fileName);
    if (!fs.existsSync(srcImg)) {
      throw new Error(`Missing image file: ${srcImg}`);
    }
    fs.copyFileSync(srcImg, dstImg);
    totalCopiedImages += 1;
    return {
      page: p.page,
      image: `./books/${slug}/${fileName}`,
      text: {
        zh: String(p.text?.zh ?? "").trim(),
        en: String(p.text?.en ?? "").trim(),
        cs: String(p.text?.cs ?? "").trim(),
      },
    };
  });

  // Check custom-music override first, then source music.mp3
  let musicSrc = undefined;
  const customAudio = findCustomAudio(slug, book.title?.zh ?? "");
  const audioSourceFile =
    customAudio ??
    (book.musicSrc ? path.join(srcBookDir, path.basename(book.musicSrc)) : null);

  if (audioSourceFile && fs.existsSync(audioSourceFile)) {
    const audioBuf = fs.readFileSync(audioSourceFile);
    const hash = crypto.createHash("sha256").update(audioBuf).digest("hex").slice(0, 12);
    if (!audioHashToPath.has(hash)) {
      const ext = path.extname(audioSourceFile) || ".mp3";
      const sharedName = `music-${hash}${ext}`;
      fs.writeFileSync(path.join(targetSharedAudio, sharedName), audioBuf);
      audioHashToPath.set(hash, `./books/_shared/${sharedName}`);
      totalCopiedAudio += 1;
    }
    musicSrc = audioHashToPath.get(hash);
  }

  let themeSongSrc = undefined;
  let themeSongDurationSec = undefined;
  const songLookupKeys = [
    normalizeMatchKey(book.title?.zh),
    normalizeMatchKey(book.slug),
    normalizeMatchKey(book.sourceName),
  ].filter(Boolean);

  for (const key of songLookupKeys) {
    if (themeSongMap.has(key)) {
      const srcSongFile = themeSongMap.get(key);
      const dstSongFile = path.join(targetSongsDir, `${slug}.mp3`);
      fs.copyFileSync(srcSongFile, dstSongFile);
      themeSongSrc = `./books/_songs/${slug}.mp3`;
      themeSongDurationSec = probeAudioDurationSec(srcSongFile);
      totalMatchedSongs += 1;
      matchedSongLogs.push(
        `  - ${path.basename(srcSongFile)} -> ${slug} (${themeSongDurationSec ?? "unknown"}s)`,
      );
      break;
    }
  }

  const coverFileName = path.basename(book.coverImage || pages[0]?.image || "page-01.webp");

  const summary = {
    zh:
      String(book.backCoverText?.zh ?? "").trim() ||
      buildFallbackSummary(book.pages, "zh"),
    en:
      String(book.backCoverText?.en ?? "").trim() ||
      buildFallbackSummary(book.pages, "en"),
    cs:
      String(book.backCoverText?.cs ?? "").trim() ||
      buildFallbackSummary(book.pages, "cs"),
  };

  return {
    order: index + 1,
    slug,
    sourceName: book.sourceName,
    title: {
      zh: String(book.title?.zh ?? book.sourceName).trim(),
      en: String(book.title?.en ?? book.sourceName).trim(),
      cs: String(book.title?.cs ?? book.sourceName).trim(),
    },
    summary,
    coverImage: `./books/${slug}/${coverFileName}`,
    musicSrc,
    ...(themeSongSrc ? { themeSongSrc, themeSongDurationSec } : {}),
    pageCount: pages.length,
    pages,
  };
});

fs.writeFileSync(targetBooksJson, JSON.stringify(cinemaBooks, null, 2) + "\n", "utf8");

// 3. Import 3-language About JSONL files
const aboutMap = { zh: null, en: null, cs: null };
const aboutFiles = [
  { code: "zh", file: "about-zh-Hant.jsonl" },
  { code: "en", file: "about-en.jsonl" },
  { code: "cs", file: "about-cs.jsonl" },
];

for (const { code, file } of aboutFiles) {
  const fullPath = path.join(sourceAboutDir, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing About JSONL: ${fullPath}`);
  }
  const lines = fs
    .readFileSync(fullPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const records = lines.map((l) => JSON.parse(l));

  let title = "";
  let openingParagraphs = [];
  const sections = [];
  let pendingHeading = null;

  for (const rec of records) {
    if (rec.record_type === "heading") {
      if (rec.level === 1) {
        title = rec.text;
      } else {
        pendingHeading = rec.text;
      }
    } else if (rec.record_type === "body") {
      if (!pendingHeading) {
        openingParagraphs = rec.paragraphs;
      } else {
        sections.push({ headingText: pendingHeading, paragraphs: rec.paragraphs });
        pendingHeading = null;
      }
    }
  }

  aboutMap[code] = { lang: code, title, openingParagraphs, sections };
}

fs.writeFileSync(targetAboutJson, JSON.stringify(aboutMap, null, 2) + "\n", "utf8");

console.log(
  `Imported ${cinemaBooks.length} trilingual books (${totalCopiedImages} images, ${totalCopiedAudio} unique BGM, ${totalMatchedSongs} theme songs), 3 About pages, and logo from ${sourceRoot}`,
);
if (matchedSongLogs.length > 0) {
  console.log("Matched theme songs:\n" + matchedSongLogs.join("\n"));
}
