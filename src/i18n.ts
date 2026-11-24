import type { LanguageCode } from "./types";

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  zh: "繁體中文",
  en: "English",
  cs: "Čeština",
};

export const LANGUAGE_SHORT: Record<LanguageCode, string> = {
  zh: "繁中",
  en: "EN",
  cs: "CS",
};

export interface UiStrings {
  brandSub: string;
  tabBooks: string;
  tabVideos: string;
  tabAbout: string;
  btnAutoplayAll: string;
  btnSettings: string;
  btnStartReading: string;
  btnAutoplayBook: string;
  pagesUnit: string;
  backToShelf: string;
  backToVideos: string;
  pageCounter: (cur: number, total: number) => string;
  nextBook: string;
  autoplaying: (sec: number) => string;
  startAutoplay: string;
  muted: string;
  music: string;
  manualIdleHint: (sec: number) => string;
  autoplayModalTitle: (sec: number) => string;
  selectAll: (count: number) => string;
  clearAll: string;
  selectedHint: (count: number) => string;
  cancel: string;
  startPlaylist: (count: number) => string;
  settingsTitle: string;
  settingPageDurTitle: string;
  settingPageDurDesc: string;
  smartPace: string;
  settingIdleTitle: string;
  settingIdleDesc: string;
  settingMusicTitle: string;
  settingMusicDesc: string;
  musicOn: string;
  musicOff: string;
  secUnit: (sec: number) => string;
  off: string;
  done: string;
  videoFolderNone: string;
  videoFolderStatus: (name: string, count: number) => string;
  videoFolderHint: string;
  playAllVideos: string;
  rescan: string;
  changeFolder: string;
  pickFolder: string;
  loading: string;
  emptyVideoTitleNoFolder: string;
  emptyVideoTitleEmpty: string;
  emptyVideoDesc: string;
  ytComingSoon: string;
  prevVideo: string;
  nextVideo: string;
  play: string;
  pause: string;
  sound: string;
  carouselHint: string;
}

export const UI_STRINGS: Record<LanguageCode, UiStrings> = {
  zh: {
    brandSub: "GATE STORY",
    tabBooks: "繪本",
    tabVideos: "影片",
    tabAbout: "關於",
    btnAutoplayAll: "自動輪播",
    btnSettings: "設定",
    btnStartReading: "閱讀",
    btnAutoplayBook: "播放",
    pagesUnit: "頁",
    backToShelf: "返回書架",
    backToVideos: "返回影片牆",
    pageCounter: (c, t) => `第 ${c} / ${t} 頁`,
    nextBook: "下一本",
    autoplaying: (s) => `自動播放中（${s}秒）`,
    startAutoplay: "開始自動播放",
    muted: "靜音",
    music: "音樂",
    manualIdleHint: (s) => `手動翻頁中・${s} 秒後恢復自動播放`,
    autoplayModalTitle: (s) =>
      s === 0 ? "自動輪播設定（智慧依字數）" : `自動輪播設定（每頁 ${s} 秒）`,
    selectAll: (n) => `全選 ${n} 本`,
    clearAll: "全部取消",
    selectedHint: (n) => `已選 ${n} 本（單選循環重播；多選依序連續輪播）`,
    cancel: "取消",
    startPlaylist: (n) => `開始自動輪播（${n} 本）`,
    settingsTitle: "播放與顯示設定",
    settingPageDurTitle: "自動翻頁秒數",
    settingPageDurDesc: "前 2 頁固定 5 秒；第 3 頁起可依字數智慧配速（5～35 秒）或固定秒數",
    smartPace: "智慧（依字數）",
    settingIdleTitle: "閒置自動恢復秒數",
    settingIdleDesc: "觸控暫停自動播放後，無人操作多久自動恢復輪播（預設 30 秒）",
    settingMusicTitle: "繪本背景音樂",
    settingMusicDesc: "閱讀繪本時播放配樂，切換至影片時會自動暫停",
    musicOn: "開啟中",
    musicOff: "已靜音",
    secUnit: (s) => `${s} 秒`,
    off: "關閉",
    done: "完成",
    videoFolderNone: "尚未指定本機影片資料夾",
    videoFolderStatus: (name, n) => `本機影片資料夾：${name}（共 ${n} 支影片）`,
    videoFolderHint: "將 .mp4 影片放入資料夾，檔名與繪本名稱相同即會自動套用封面與書名",
    playAllVideos: "全部影片輪播",
    rescan: "重新掃描",
    changeFolder: "更換資料夾",
    pickFolder: "選擇影片資料夾",
    loading: "讀取中...",
    emptyVideoTitleNoFolder: "尚未連結本機影片資料夾",
    emptyVideoTitleEmpty: "此資料夾目前找不到影片檔",
    emptyVideoDesc:
      "首次使用請點擊下方按鈕選擇白板本機的影片資料夾（例如 Movies/LeaBookVideos）。授權後系統會永久記住，之後新增 .mp4 影片都會自動讀取。",
    ytComingSoon: "繪本影片即將上線，敬請期待。",
    prevVideo: "上一支",
    nextVideo: "下一支",
    play: "播放",
    pause: "暫停",
    sound: "聲音",
    carouselHint: "左右滑動或按方向鍵切換繪本",
  },
  en: {
    brandSub: "GATE STORY",
    tabBooks: "Picture Books",
    tabVideos: "Videos",
    tabAbout: "About",
    btnAutoplayAll: "Autoplay",
    btnSettings: "Settings",
    btnStartReading: "Read Now",
    btnAutoplayBook: "Autoplay",
    pagesUnit: "pages",
    backToShelf: "Back",
    backToVideos: "Back to Videos",
    pageCounter: (c, t) => `Page ${c} / ${t}`,
    nextBook: "Next Book",
    autoplaying: (s) => `Autoplaying (${s}s)`,
    startAutoplay: "Start Autoplay",
    muted: "Muted",
    music: "Music",
    manualIdleHint: (s) => `Manual mode · Autoplay resumes in ${s}s`,
    autoplayModalTitle: (s) =>
      s === 0 ? "Autoplay Playlist (Smart Pace)" : `Autoplay Playlist (${s}s / page)`,
    selectAll: (n) => `Select All (${n})`,
    clearAll: "Clear All",
    selectedHint: (n) =>
      `${n} selected (1 book loops; multiple books play sequentially)`,
    cancel: "Cancel",
    startPlaylist: (n) => `Start Autoplay (${n})`,
    settingsTitle: "Playback Settings",
    settingPageDurTitle: "Autoplay Page Duration",
    settingPageDurDesc: "First 2 pages stay 5s; pages 3+ auto-pace by text length (5–35s) or fixed seconds",
    smartPace: "Smart (Auto)",
    settingIdleTitle: "Idle Auto-Resume",
    settingIdleDesc: "Resume autoplay automatically after inactivity (default 30s)",
    settingMusicTitle: "Background Music",
    settingMusicDesc: "Plays gently while reading; pauses automatically for videos",
    musicOn: "On",
    musicOff: "Muted",
    secUnit: (s) => `${s}s`,
    off: "Off",
    done: "Done",
    videoFolderNone: "No local video folder selected",
    videoFolderStatus: (name, n) => `Folder: ${name} (${n} videos)`,
    videoFolderHint: "Place .mp4 files in the folder to auto-match book covers",
    playAllVideos: "Play All",
    rescan: "Rescan",
    changeFolder: "Change Folder",
    pickFolder: "Select Video Folder",
    loading: "Loading...",
    emptyVideoTitleNoFolder: "No Local Video Folder Linked",
    emptyVideoTitleEmpty: "No Video Files Found",
    emptyVideoDesc:
      "Tap below to select your local video folder once (e.g. Movies/LeaBookVideos). Access persists offline across reboots.",
    ytComingSoon: "Picture book videos are coming soon.",
    prevVideo: "Prev",
    nextVideo: "Next",
    play: "Play",
    pause: "Pause",
    sound: "Sound",
    carouselHint: "Swipe or press Left / Right to browse books",
  },
  cs: {
    brandSub: "GATE STORY",
    tabBooks: "Obrázkové knihy",
    tabVideos: "Videa",
    tabAbout: "O projektu",
    btnAutoplayAll: "Automaticky",
    btnSettings: "Nastavení",
    btnStartReading: "Číst knihu",
    btnAutoplayBook: "Přehrát",
    pagesUnit: "stran",
    backToShelf: "Zpět",
    backToVideos: "Zpět na videa",
    pageCounter: (c, t) => `Strana ${c} / ${t}`,
    nextBook: "Další kniha",
    autoplaying: (s) => `Přehrávání (${s}s)`,
    startAutoplay: "Spustit přehrávání",
    muted: "Ztlumeno",
    music: "Hudba",
    manualIdleHint: (s) => `Ruční režim · Automaticky za ${s}s`,
    autoplayModalTitle: (s) =>
      s === 0 ? "Automatické přehrávání (Chytré tempo)" : `Automatické přehrávání (${s}s / strana)`,
    selectAll: (n) => `Vybrat vše (${n})`,
    clearAll: "Zrušit vše",
    selectedHint: (n) =>
      `Vybráno ${n} (1 kniha ve smyčce; více knih postupně za sebou)`,
    cancel: "Zrušit",
    startPlaylist: (n) => `Spustit (${n})`,
    settingsTitle: "Nastavení přehrávání",
    settingPageDurTitle: "Délka stránky",
    settingPageDurDesc: "První 2 strany 5 s; od 3. strany chytré tempo dle textu (5–35 s) nebo pevný čas",
    smartPace: "Chytré (dle textu)",
    settingIdleTitle: "Obnovení po nečinnosti",
    settingIdleDesc: "Po kolika sekundách nečinnosti se obnoví automatické přehrávání",
    settingMusicTitle: "Hudba na pozadí",
    settingMusicDesc: "Hraje při čtení; u videí se automaticky pozastaví",
    musicOn: "Zapnuto",
    musicOff: "Ztlumeno",
    secUnit: (s) => `${s} s`,
    off: "Vypnuto",
    done: "Hotovo",
    videoFolderNone: "Není vybrána místní složka videí",
    videoFolderStatus: (name, n) => `Složka: ${name} (${n} videí)`,
    videoFolderHint: "Vložte .mp4 videa do složky pro automatické přiřazení obálek",
    playAllVideos: "Přehrát vše",
    rescan: "Obnovit",
    changeFolder: "Změnit složku",
    pickFolder: "Vybrat složku videí",
    loading: "Načítání...",
    emptyVideoTitleNoFolder: "Složka videí není připojena",
    emptyVideoTitleEmpty: "Žádná videa nenalezena",
    emptyVideoDesc:
      "Vyberte místní složku s videi (např. Movies/LeaBookVideos). Oprávnění zůstane uloženo i offline.",
    ytComingSoon: "Videa k obrázkovým knihám budou brzy k dispozici.",
    prevVideo: "Předchozí",
    nextVideo: "Další",
    play: "Přehrát",
    pause: "Pozastavit",
    sound: "Zvuk",
    carouselHint: "Přejeďte prstem nebo použijte šipky vlevo / vpravo",
  },
};
