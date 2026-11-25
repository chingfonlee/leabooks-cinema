# 專案比較：`leabooks-cinema` vs `lea-book-TV`

> 更新日期：2026-11-25

這兩個專案都包含同一批 **11 本繪本** 的離線 Android TV / 互動大屏應用，但 **`leabooks-cinema` 是 `lea-book-TV` 的全面升級版**，且網頁版與 Android APK 共用同一套程式碼。

## 功能與架構比較

| 比較項目 | `lea-book-TV`（舊版） | `leabooks-cinema`（新版／主力） |
| :--- | :--- | :--- |
| **GitHub Repo** | `chingfonlee/leabooks-apk` | `chingfonlee/leabooks-cinema` |
| **定位與平台** | 僅離線 Android TV / 白板 APK | **網頁版（https://leabooks-cinema.pages.dev ）＋ 離線 Android APK 共用同一套程式碼** |
| **APK 名稱與 App ID** | `LeaBook-TV-debug.apk`（`com.leabook.tv`，約 `26.55 MB`） | `LeaBooks-Cinema-debug.apk`（`com.leabook.cinema`，約 `50.72 MB`） |
| **主畫面與瀏覽模式** | 僅單一 4 欄網格式書架 | **劇院式主畫面（Hero 全幅封面輪播 + 動態傾斜故事牆背景 + 底部統一播放列）**＋ **雙排橫向書架模式** |
| **語言支援** | 僅繁體中文 | **三語即時切換**（繁體中文 `zh`／英文 `en`／捷克文 `cs`） |
| **音樂與主題曲** | 僅共用背景音樂（1 首 BGM） | **雙軌音樂模式**：除了共用 BGM，其中 **5 本繪本內建專屬主題曲**（`public/books/_songs/`），支援依歌曲長度智慧配速翻頁與頂部切換鈕（APK 多約 24 MB 的主要原因） |
| **閱讀器控制** | 基本翻頁、15 秒倒數、靜音／開關 | 新增**圖形化字體大小調整、4 段音量控制、頂部主題曲切換、底部快速導覽列（含回首頁／音量）** |
| **額外頁面與影片** | 僅本機資料夾 MP4 播放 | 除本機 MP4 外，另有 **「關於我們（About）」專文頁**，以及網頁版 YouTube 影片彈窗與深層連結（`/books/<slug>/<lang>`） |
| **Android TV 8 Oreo 遙控器** | 基本 JS 空間導覽 | 已加上 **`MainActivity.java` 原生方向鍵攔截**、停用 Android 8 系統預設焦點高光、同軸對齊演算法與 TV 橫向精簡單排播放列 |

## 維護建議

- **`leabooks-cinema` 已完全涵蓋 `lea-book-TV` 的所有核心功能**（11 本離線繪本、本機影片資料夾播放、自動輪播、TV 遙控器與觸控操作），且 APK 與網頁版畫面保持一致。
- 後續維護、新增繪本、更新主題曲或安裝到 Android TV／互動白板時，請以 **`leabooks-cinema`** 為主力專案；`lea-book-TV` 保留作為早期純書架原型版本參考。
