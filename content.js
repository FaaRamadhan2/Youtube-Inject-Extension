/*
 * YouTube Focus Anti Pause Combo
 * Copyright (C) 2026 Faa Ramadhan
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
"use strict";

(() => {
  const VERSION = "13.0.0";
  const STORAGE_KEY = "ytFocusAntiPauseComboV13";
  const OLD_STORAGE_KEY = "ytInjectAntiPauseV12";
  const CONTROLLER = "__YT_FOCUS_COMBO_V13__";
  const STYLE_ID = "yt-focus-combo-style";
  const CUSTOM_STYLE_ID = "yt-focus-combo-custom-style";
  const CUSTOM_CSS_FOLDER_ID = "yt-focus-combo-custom-folder-style";

  const DEFAULTS = {
    enabled: true,
    antiPause: true,
    hideComments: true,
    hideSidebar: false,
    hideShorts: true,
    cleanPlayer: true,
    hideHomeFeed: false,
    hideEndScreen: true,
    cinemaWidth: false,
    adCleaner: true,
    adMode: "normal",
    theme: "youtubeDefault",
    customColors: false,
    accent: "#38bdf8",
    bg: "#06202b",
    text: "#e6fbff",
    wallpaperEnabled: false,
    wallpaperUrl: "",
    wallpaperDataUrl: "",
    wallpaperName: "",
    wallpaperOpacity: 35,
    wallpaperBlur: 4,
    wallpaperDim: 55,
    customCssEnabled: false,
    customCss: "",
    folderCssFile: ""
  };

  const THEMES = {
    youtubeDefault: { isDefault: true, accent: "#ff0000", accent2: "#ff4444", bg: "#0f0f0f", bg2: "#0f0f0f", surface: "transparent", surface2: "transparent", card: "transparent", desc: "transparent", inputText: "#0f0f0f", inputBg: "rgba(255,255,255,.94)", text: "#f1f1f1", muted: "#aaa", border: "transparent" },
    darkRed: { accent: "#fb7185", accent2: "#f97316", bg: "#0f070a", bg2: "#190b10", surface: "rgba(28,12,18,.94)", surface2: "rgba(251,113,133,.14)", card: "rgba(24,10,15,.82)", desc: "rgba(35,14,22,.94)", inputText: "#2a0710", inputBg: "rgba(255,245,247,.94)", text: "#fff1f4", muted: "#d8a1ad", border: "rgba(251,113,133,.26)" },
    midnightBlue: { accent: "#60a5fa", accent2: "#38bdf8", bg: "#07111f", bg2: "#0b1f34", surface: "rgba(10,25,42,.94)", surface2: "rgba(96,165,250,.14)", card: "rgba(10,24,39,.82)", desc: "rgba(13,31,51,.94)", inputText: "#07111f", inputBg: "rgba(239,247,255,.94)", text: "#eef7ff", muted: "#a9c3d8", border: "rgba(96,165,250,.26)" },
    purpleNeon: { accent: "#c084fc", accent2: "#f0abfc", bg: "#10091d", bg2: "#1b102d", surface: "rgba(28,15,48,.94)", surface2: "rgba(192,132,252,.14)", card: "rgba(25,13,43,.82)", desc: "rgba(33,17,57,.94)", inputText: "#160821", inputBg: "rgba(248,242,255,.94)", text: "#faf5ff", muted: "#c8b6dc", border: "rgba(192,132,252,.28)" },
    lightBlueSea: { accent: "#38bdf8", accent2: "#2dd4bf", bg: "#06202b", bg2: "#0a3542", surface: "rgba(9,43,55,.94)", surface2: "rgba(56,189,248,.14)", card: "rgba(9,39,50,.82)", desc: "rgba(12,47,58,.94)", inputText: "#082f49", inputBg: "rgba(240,253,255,.94)", text: "#e6fbff", muted: "#a7d8e2", border: "rgba(56,189,248,.26)" },
    limeForest: { accent: "#a3e635", accent2: "#22c55e", bg: "#071408", bg2: "#10230f", surface: "rgba(13,34,15,.94)", surface2: "rgba(163,230,53,.14)", card: "rgba(12,30,14,.82)", desc: "rgba(17,42,18,.94)", inputText: "#10200b", inputBg: "rgba(247,255,237,.94)", text: "#f1ffe5", muted: "#bfd9a8", border: "rgba(163,230,53,.26)" },
    blackGlass: { accent: "#e5e7eb", accent2: "#94a3b8", bg: "#020617", bg2: "#0b1020", surface: "rgba(10,14,28,.86)", surface2: "rgba(255,255,255,.11)", card: "rgba(12,18,34,.68)", desc: "rgba(15,23,42,.90)", inputText: "#020617", inputBg: "rgba(248,250,252,.94)", text: "#f8fafc", muted: "#b8c3d3", border: "rgba(255,255,255,.18)" }
  };

  const POPUP_PATTERNS = [
    /video\s+dijeda/i, /lanjutkan\s+menonton/i, /masih\s+menonton/i,
    /video\s+paused/i, /continue\s+watching/i, /are\s+you\s+still\s+watching/i,
    /still\s+watching/i, /keep\s+watching/i
  ];
  const YES_PATTERNS = [
    /^ya$/i, /^iya$/i, /^ok$/i, /^oke$/i, /^lanjut$/i, /^lanjutkan$/i,
    /^yes$/i, /^okay$/i, /^continue$/i, /^continue watching$/i, /^keep watching$/i,
    /^resume$/i, /^got it$/i
  ];
  const NO_PATTERNS = [/^tidak$/i, /^nggak$/i, /^gak$/i, /^no$/i, /^cancel$/i, /^batal$/i, /^close$/i, /^not now$/i];
  const DIALOG_SELECTOR = "tp-yt-paper-dialog,yt-confirm-dialog-renderer,ytd-popup-container,ytmusic-popup-container,ytmusic-you-there-renderer,div[role='dialog'],div[aria-modal='true']";
  const BUTTON_SELECTOR = "button,a,yt-button-renderer,ytd-button-renderer,tp-yt-paper-button,ytmusic-button-renderer,div[role='button'],span[role='button']";

  if (window[CONTROLLER]?.destroy) window[CONTROLLER].destroy();

  let settings = { ...DEFAULTS };
  let observer = null;
  let interval = 0;
  let lastAntiPauseScan = 0;
  let lastAntiPauseClick = 0;

  function normalize(value) {
    return { ...DEFAULTS, ...(value || {}) };
  }

  function clamp(value, min, max) {
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
  }

  function cssUrl(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, "%22").replace(/\n/g, "");
  }

  function safeImageSource(value) {
    const source = String(value || "").trim();
    if (source.startsWith("data:image/")) return source;
    if (/^https:\/\//i.test(source)) return source;
    return "";
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(clean)) return `rgba(8,19,34,${alpha})`;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function ensureStyle(id) {
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      style.dataset.ytFocusCombo = "true";
      (document.head || document.documentElement).appendChild(style);
    }
    return style;
  }

  function removeOwnedNodes() {
    document.querySelectorAll("[data-yt-focus-combo='true']").forEach(node => node.remove());
  }

  function getTheme() {
    const base = THEMES[settings.theme] || THEMES.youtubeDefault;
    if (!settings.customColors) return base;
    return {
      ...base,
      isDefault: false,
      accent: settings.accent || base.accent,
      accent2: settings.accent || base.accent2,
      bg: settings.bg || base.bg,
      bg2: settings.bg || base.bg2,
      surface: hexToRgba(settings.bg || base.bg, 0.94),
      surface2: hexToRgba(settings.accent || base.accent, 0.14),
      card: hexToRgba(settings.bg || base.bg, 0.82),
      desc: hexToRgba(settings.bg || base.bg, 0.94),
      inputText: settings.bg || base.inputText,
      inputBg: "rgba(248,250,252,.94)",
      text: settings.text || base.text,
      border: hexToRgba(settings.accent || base.accent, 0.26)
    };
  }

  function wallpaperCss() {
    if (!settings.enabled || !settings.wallpaperEnabled) return "";
    const src = safeImageSource(settings.wallpaperDataUrl || settings.wallpaperUrl);
    if (!src) return "";
    const opacity = clamp(Number(settings.wallpaperOpacity) / 100, 0, 1);
    const blur = clamp(Number(settings.wallpaperBlur), 0, 24);
    const dim = clamp(Number(settings.wallpaperDim) / 100, 0, 0.9);
    return `
      html::before{content:""!important;position:fixed!important;inset:0!important;z-index:-2!important;pointer-events:none!important;background-image:url("${cssUrl(src)}")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;opacity:${opacity}!important;filter:blur(${blur}px)!important;transform:scale(1.06)!important}
      html::after{content:""!important;position:fixed!important;inset:0!important;z-index:-1!important;pointer-events:none!important;background:rgba(0,0,0,${dim})!important}
      html,body,ytd-app,#content,#page-manager,ytd-page-manager{background:transparent!important}
    `;
  }

  function themeCss() {
    if (!settings.enabled) return "";
    const t = getTheme();
    const wallpaper = wallpaperCss();
    if (t.isDefault) return wallpaper;
    return `${wallpaper}
      html,html[dark],body,ytd-app,ytd-watch-flexy,ytd-browse,ytd-search,ytd-page-manager{--yt-spec-base-background:${t.bg}!important;--yt-spec-raised-background:${t.surface}!important;--yt-spec-menu-background:${t.surface}!important;--yt-spec-text-primary:${t.text}!important;--yt-spec-text-secondary:${t.muted}!important;--yt-spec-call-to-action:${t.accent}!important;--yt-spec-themed-blue:${t.accent}!important;color:${t.text}!important}
      html,body{background:linear-gradient(180deg,${t.bg2},${t.bg})!important;color:${t.text}!important}
      ytd-app,#content,#page-manager,ytd-page-manager,ytd-watch-flexy,ytd-browse,ytd-search,ytd-rich-grid-renderer,ytd-section-list-renderer,ytd-item-section-renderer{background:${settings.wallpaperEnabled ? "transparent" : `linear-gradient(180deg,${t.bg2},${t.bg})`}!important;color:${t.text}!important}
      ytd-masthead,#masthead,#background.ytd-masthead{background:linear-gradient(90deg,${t.surface},${hexToRgba(t.accent,0.08)})!important;color:${t.text}!important;border-bottom:1px solid ${t.border}!important;backdrop-filter:blur(18px)!important}
      #container.ytd-searchbox,#search-input,#search-input input,ytd-searchbox input{background:${t.inputBg}!important;color:${t.inputText}!important;border-color:${t.border}!important;caret-color:${t.accent}!important}
      #search-icon-legacy,button#search-icon-legacy{background:${t.inputBg}!important;color:${t.inputText}!important;border-color:${t.border}!important}
      #guide-content,#guide-inner-content,ytd-mini-guide-renderer,ytd-watch-metadata,#below,#secondary,ytd-playlist-panel-renderer,ytd-engagement-panel-section-list-renderer,tp-yt-paper-dialog,ytd-popup-container,ytd-multi-page-menu-renderer,ytd-menu-popup-renderer{background:${t.surface}!important;color:${t.text}!important;border-color:${t.border}!important}
      ytd-multi-page-menu-renderer #container,ytd-multi-page-menu-renderer #sections,ytd-multi-page-menu-renderer #items,ytd-multi-page-menu-renderer #header,ytd-multi-page-menu-renderer ytd-simple-menu-header-renderer,ytd-multi-page-menu-renderer ytd-notification-section-renderer{background:${t.surface}!important;color:${t.text}!important;border-color:${t.border}!important}
      ytd-multi-page-menu-renderer #header,ytd-multi-page-menu-renderer ytd-simple-menu-header-renderer{border-bottom:1px solid ${t.border}!important}
      ytd-multi-page-menu-renderer ytd-notification-renderer,ytd-multi-page-menu-renderer ytd-notification-renderer #content,ytd-multi-page-menu-renderer ytd-notification-renderer #metadata,ytd-multi-page-menu-renderer ytd-notification-renderer #details{background:${t.card}!important;color:${t.text}!important}
      ytd-multi-page-menu-renderer ytd-notification-renderer:hover{background:${t.surface2}!important}
      ytd-watch-metadata,#below{border-radius:16px!important;padding:12px!important}
      ytd-rich-item-renderer,ytd-compact-video-renderer,ytd-playlist-panel-video-renderer,ytd-grid-video-renderer,ytd-rich-grid-media,ytd-compact-radio-renderer,ytd-compact-playlist-renderer,ytd-radio-renderer{background:${t.card}!important;color:${t.text}!important;border:1px solid ${t.border}!important;border-radius:14px!important;overflow:hidden!important}
      ytd-rich-item-renderer:hover,ytd-compact-video-renderer:hover,ytd-playlist-panel-video-renderer:hover,ytd-compact-radio-renderer:hover,ytd-compact-playlist-renderer:hover,ytd-radio-renderer:hover{background:${t.surface2}!important}
      ytd-thumbnail,ytd-thumbnail img,#thumbnail,#thumbnail img{border-radius:12px!important;overflow:hidden!important}
      yt-formatted-string,#video-title,#title,#content-text,#metadata-line,#description,#owner,#channel-name,#text,.yt-core-attributed-string,.yt-spec-button-shape-next__button-text-content{color:${t.text}!important}
      #metadata-line span,#secondary-text,#byline,#owner-sub-count,#subtitle,.ytd-video-meta-block,.metadata-snippet-text,#description-text,#channel-info{color:${t.muted}!important}
      a,#text.ytd-channel-name,#owner-name a,yt-icon,ytd-button-renderer,yt-button-shape,paper-button{color:${t.accent}!important}
      #progress,.ytp-play-progress,.ytp-swatch-background-color,.ytp-swatch-color{background:linear-gradient(90deg,${t.accent},${t.accent2})!important;color:${t.accent}!important}
      ytd-text-inline-expander,#description,#description-inline-expander,#description-inner,#snippet,#expandable-metadata,ytd-watch-info-text,ytd-video-secondary-info-renderer,ytd-structured-description-content-renderer{background:${t.desc}!important;color:${t.text}!important;border-color:${t.border}!important;border-radius:14px!important}
      ytd-popup-container *,tp-yt-paper-dialog *,ytd-multi-page-menu-renderer *,ytd-menu-popup-renderer *,ytd-playlist-panel-renderer *{color:${t.text}!important}
      ytd-popup-container yt-icon,ytd-popup-container tp-yt-iron-icon,ytd-playlist-panel-renderer yt-icon,ytd-playlist-panel-renderer tp-yt-iron-icon{color:${t.accent}!important;fill:${t.accent}!important}
      ytd-popup-container #secondary-text,ytd-popup-container #metadata,ytd-popup-container #time,ytd-playlist-panel-renderer #byline,ytd-playlist-panel-renderer #metadata,ytd-playlist-panel-renderer #video-info,ytd-playlist-panel-renderer #subtitle,ytd-playlist-panel-renderer #index,ytd-playlist-panel-renderer .publisher{color:${t.muted}!important}
      ytd-playlist-panel-renderer{border:1px solid ${t.border}!important;border-radius:16px!important;overflow:hidden!important;box-shadow:0 20px 60px rgba(0,0,0,.36)!important}
      ytd-playlist-panel-renderer .playlist-items,ytd-playlist-panel-renderer #items{background:${t.surface}!important;color:${t.text}!important}
      ytd-playlist-panel-video-renderer{margin:4px 8px!important;border-radius:12px!important;background:${t.card}!important}
      ytd-playlist-panel-video-renderer:hover,ytd-playlist-panel-video-renderer[selected],ytd-playlist-panel-video-renderer[watch-color-update]{background:${t.surface2}!important}
      ytd-playlist-panel-renderer .header{background:${t.desc}!important;border-bottom:1px solid ${t.border}!important;padding:12px 16px!important}
      ytd-playlist-panel-renderer .title{color:${t.text}!important;font-weight:500!important}
      ytd-playlist-panel-renderer .publisher{color:${t.muted}!important}
      ytd-item-section-renderer #header{background:transparent!important;padding:12px 16px!important;border-bottom:1px solid ${t.border}!important}
      ytd-item-section-renderer #header #title,ytd-watch-next-secondary-results-renderer #header yt-formatted-string{color:${t.text}!important}
      ytd-search ytd-video-renderer,ytd-search ytd-radio-renderer,ytd-search ytd-playlist-renderer,ytd-search ytd-shelf-renderer{background:transparent!important;border:0!important;border-radius:0!important;overflow:visible!important;box-shadow:none!important;transform:none!important}
    `;
  }

  function featureCss() {
    if (!settings.enabled) return "";
    return `
      ${settings.hideComments ? "ytd-comments,#comments,#comment-teaser,ytd-comment-thread-renderer{display:none!important}" : ""}
      ${settings.hideSidebar ? "#secondary,ytd-watch-next-secondary-results-renderer,ytd-compact-video-renderer,ytd-compact-radio-renderer,ytd-reel-shelf-renderer,ytd-shelf-renderer{display:none!important}ytd-watch-flexy[flexy] #primary{max-width:100%!important}ytd-watch-flexy[flexy] #columns{justify-content:center!important}" : ""}
      ${settings.hideShorts ? "a[href^='/shorts'],a[href*='/shorts/'],ytd-guide-entry-renderer a[title='Shorts'],ytd-mini-guide-entry-renderer[aria-label='Shorts'],ytd-reel-shelf-renderer,ytd-rich-shelf-renderer,ytd-rich-section-renderer{display:none!important}" : ""}
      ${settings.cleanPlayer ? "ytd-merch-shelf-renderer,ytd-ticket-shelf-renderer,#clarify-box,#offer-module{display:none!important}#below,ytd-watch-metadata{max-width:980px!important;margin-inline:auto!important}" : ""}
      ${settings.hideHomeFeed ? "ytd-browse[page-subtype='home'] ytd-rich-grid-renderer,ytd-browse[page-subtype='home'] ytd-two-column-browse-results-renderer{display:none!important}" : ""}
      ${settings.hideEndScreen ? ".ytp-ce-element,.ytp-cards-teaser,.ytp-paid-content-overlay,.ytp-suggested-action,.ytp-endscreen-content{display:none!important}" : ""}
      ${settings.cinemaWidth ? "ytd-watch-flexy[theater] #player-theater-container,ytd-watch-flexy #full-bleed-container,#movie_player,.html5-video-player{border-radius:20px!important;overflow:hidden!important}ytd-watch-flexy[flexy] #primary{max-width:1280px!important;margin-inline:auto!important}#columns{max-width:1320px!important;margin-inline:auto!important}" : ""}
      ${settings.adCleaner ? "#player-ads,ytd-ad-slot-renderer,ytd-promoted-sparkles-web-renderer,ytd-promoted-video-renderer,ytd-display-ad-renderer,ytd-in-feed-ad-layout-renderer,ytd-banner-promo-renderer,.video-ads,.ytp-ad-module,.ytp-ad-overlay-container,.ytp-ad-image-overlay,.ytp-ad-player-overlay,.ytp-ad-text-overlay,.ytp-ad-preview-container{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}" : ""}
      ${settings.adCleaner && settings.adMode === "aggressive" ? "ytd-video-masthead-ad-v3-renderer,ytd-player-legacy-desktop-watch-ads-renderer,ytd-companion-slot-renderer,ytd-action-companion-ad-renderer,ytd-rich-item-renderer:has(ytd-ad-slot-renderer),ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),ytd-rich-section-renderer:has(ytd-ad-slot-renderer),ytd-ad-preview-renderer,yt-mealbar-promo-renderer{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important}" : ""}
    `;
  }

  async function loadCustomCssFolder() {
    const el = ensureStyle(CUSTOM_CSS_FOLDER_ID);
    const file = settings.folderCssFile;
    if (!settings.enabled || !file) { el.textContent = ""; return; }
    try {
      const resp = await fetch(chrome.runtime.getURL("custom-css/" + file));
      el.textContent = resp.ok ? await resp.text() : "";
    } catch { el.textContent = ""; }
  }

  function applyCss() {
    ensureStyle(STYLE_ID).textContent = [themeCss(), featureCss()].join("\n");
    ensureStyle(CUSTOM_STYLE_ID).textContent = settings.enabled && settings.customCssEnabled ? String(settings.customCss || "") : "";
    loadCustomCssFolder();
  }

  function forceTheme() {
    if (!settings.enabled) return;
    const t = getTheme();
    if (t.isDefault) return;
    const el = (sel, props) => document.querySelectorAll(sel).forEach(n => { for (const [k, v] of Object.entries(props)) { if (v != null) n.style.setProperty(k, v, 'important'); } });
    el('ytd-playlist-panel-renderer', { background: t.surface, color: t.text, borderColor: t.border });
    el('ytd-playlist-panel-renderer .playlist-items,ytd-playlist-panel-renderer #items', { background: t.surface, color: t.text });
    el('ytd-playlist-panel-renderer .header', { background: t.desc });
    el('ytd-playlist-panel-renderer #header-description', { background: t.desc });
    el('ytd-playlist-panel-renderer .title', { color: t.text });
    el('ytd-playlist-panel-renderer .publisher,ytd-playlist-panel-renderer #publisher-container', { color: t.muted });
    el('ytd-playlist-panel-video-renderer', { background: t.card, color: t.text, borderColor: t.border });
    el('ytd-compact-radio-renderer', { background: t.card, color: t.text, borderColor: t.border });
    el('ytd-compact-playlist-renderer', { background: t.card, color: t.text, borderColor: t.border });
    el('ytd-radio-renderer', { background: t.card, color: t.text, borderColor: t.border });
    el('ytd-compact-video-renderer', { background: t.card, color: t.text, borderColor: t.border });
    el('ytd-item-section-renderer #header', { borderBottomColor: t.border });
    el('ytd-item-section-renderer #header #title', { color: t.text });
    el('ytd-watch-next-secondary-results-renderer #header yt-formatted-string', { color: t.text });
  }

  function runAdCleaner() {
    if (!settings.enabled || !settings.adCleaner) return;
    const selectors = [
      "#player-ads", "ytd-ad-slot-renderer", "ytd-promoted-sparkles-web-renderer",
      "ytd-promoted-video-renderer", "ytd-display-ad-renderer", "ytd-in-feed-ad-layout-renderer",
      "ytd-banner-promo-renderer", ".video-ads", ".ytp-ad-module", ".ytp-ad-overlay-container",
      ".ytp-ad-image-overlay", ".ytp-ad-player-overlay", ".ytp-ad-text-overlay"
    ];
    if (settings.adMode === "aggressive") {
      selectors.push("ytd-video-masthead-ad-v3-renderer", "ytd-player-legacy-desktop-watch-ads-renderer", "ytd-companion-slot-renderer", "ytd-action-companion-ad-renderer", "yt-mealbar-promo-renderer");
    }
    for (const selector of selectors) {
      try {
        document.querySelectorAll(selector).forEach(node => node.remove());
      } catch {}
    }
    const skip = document.querySelector(".ytp-ad-skip-button-modern,.ytp-ad-skip-button,.ytp-skip-ad-button,button[class*='ytp-ad-skip']");
    if (skip) {
      try {
        skip.click();
      } catch {}
    }
  }

  function normalizeText(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function textOf(element) {
    if (!element) return "";
    return normalizeText([element.innerText, element.textContent, element.getAttribute?.("aria-label"), element.getAttribute?.("title")].filter(Boolean).join(" "));
  }

  function visible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  function isTargetPopup(element) {
    const text = textOf(element);
    return Boolean(text && POPUP_PATTERNS.some(pattern => pattern.test(text)));
  }

  function isYes(element) {
    const text = textOf(element);
    return Boolean(text && YES_PATTERNS.some(pattern => pattern.test(text)));
  }

  function isNo(element) {
    const text = textOf(element);
    return Boolean(text && NO_PATTERNS.some(pattern => pattern.test(text)));
  }

  function safeClick(element) {
    const target = element.closest(BUTTON_SELECTOR) || element;
    if (!visible(target)) return false;
    const now = Date.now();
    if (now - lastAntiPauseClick < 900) return false;
    lastAntiPauseClick = now;
    target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, composed: true, view: window }));
    target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, composed: true, view: window }));
    target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, view: window }));
    try {
      target.click();
    } catch {}
    return true;
  }

  function antiPauseScan() {
    if (!settings.antiPause) return false;
    const now = Date.now();
    if (now - lastAntiPauseScan < 250) return false;
    lastAntiPauseScan = now;
    const dialogs = document.querySelectorAll(DIALOG_SELECTOR);
    for (const dialog of dialogs) {
      if (!visible(dialog) || !isTargetPopup(dialog)) continue;
      const buttons = dialog.querySelectorAll(BUTTON_SELECTOR);
      for (const button of buttons) {
        if (!visible(button) || isNo(button)) continue;
        if (isYes(button)) return safeClick(button);
      }
    }
    return false;
  }

  function apply(nextSettings) {
    settings = normalize(nextSettings);
    removeOwnedNodes();
    if (!settings.enabled) return true;
    applyCss();
    forceTheme();
    runAdCleaner();
    antiPauseScan();
    return true;
  }

  function loadAndApply() {
    chrome.storage.local.get({ [STORAGE_KEY]: null, [OLD_STORAGE_KEY]: null }, data => {
      const saved = normalize(data[STORAGE_KEY] || data[OLD_STORAGE_KEY] || DEFAULTS);
      chrome.storage.local.set({ [STORAGE_KEY]: saved }, () => apply(saved));
    });
  }

  function onMessage(message, sender, sendResponse) {
    if (message?.type === "YT_FOCUS_COMBO_APPLY" || message?.type === "YT_IAP_APPLY") {
      apply(message.settings);
      sendResponse({ ok: true, version: VERSION });
      return true;
    }
    if (message?.type === "YT_FOCUS_COMBO_SCAN" || message?.type === "YT_IAP_SCAN") {
      sendResponse({ ok: true, clicked: antiPauseScan(), version: VERSION });
      return true;
    }
    return false;
  }

  function onStorage(changes, areaName) {
    if (areaName !== "local") return;
    const change = changes[STORAGE_KEY] || changes[OLD_STORAGE_KEY];
    if (change) apply(change.newValue);
  }

  function destroy() {
    try {
      observer?.disconnect();
    } catch {}
    try {
      clearInterval(interval);
    } catch {}
    try {
      chrome.runtime.onMessage.removeListener(onMessage);
    } catch {}
    try {
      chrome.storage.onChanged.removeListener(onStorage);
    } catch {}
    removeOwnedNodes();
  }

  chrome.runtime.onMessage.addListener(onMessage);
  chrome.storage.onChanged.addListener(onStorage);
  let themeTimer = 0;
  observer = new MutationObserver(() => {
    runAdCleaner();
    antiPauseScan();
    if (!themeTimer) { themeTimer = setTimeout(() => { themeTimer = 0; forceTheme(); }, 300); }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  interval = setInterval(() => {
    runAdCleaner();
    antiPauseScan();
  }, 1000);
  window[CONTROLLER] = { destroy, apply, version: VERSION };
  loadAndApply();
})();
