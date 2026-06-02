/*
 * YT Auto Inject Anti Pause
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
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

"use strict";

const STORAGE_KEY = "ytInjectAntiPauseV12";
const TARGET_URLS = ["https://youtube.com/*", "https://www.youtube.com/*", "https://music.youtube.com/*"];

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
  customCss: ""
};

const PRESET_COLORS = {
  youtubeDefault: { accent: "#ff0000", bg: "#0f0f0f", text: "#f1f1f1" },
  darkRed: { accent: "#fb7185", bg: "#0f070a", text: "#fff1f4" },
  midnightBlue: { accent: "#60a5fa", bg: "#07111f", text: "#eef7ff" },
  purpleNeon: { accent: "#c084fc", bg: "#10091d", text: "#faf5ff" },
  lightBlueSea: { accent: "#38bdf8", bg: "#06202b", text: "#e6fbff" },
  limeForest: { accent: "#a3e635", bg: "#071408", text: "#f1ffe5" },
  blackGlass: { accent: "#e5e7eb", bg: "#020617", text: "#f8fafc" }
};

const FIELD_IDS = [
  "enabled", "antiPause", "hideComments", "hideSidebar", "hideShorts", "cleanPlayer",
  "hideHomeFeed", "hideEndScreen", "cinemaWidth", "adCleaner", "adMode", "theme",
  "customColors", "accent", "bg", "text", "wallpaperEnabled", "wallpaperUrl",
  "wallpaperOpacity", "wallpaperBlur", "wallpaperDim", "customCssEnabled", "customCss"
];

const el = {};
let current = { ...DEFAULTS };
let liveTimer = null;

function qs(id) {
  return document.getElementById(id);
}

function bootElements() {
  for (const id of FIELD_IDS) el[id] = qs(id);
  el.msg = qs("msg");
  el.statusDot = qs("statusDot");
  el.wallpaperFile = qs("wallpaperFile");
  el.wallpaperName = qs("wallpaperName");
}

function setMsg(text, bad = false) {
  if (!el.msg) return;
  el.msg.textContent = text;
  el.msg.style.color = bad ? "#fecdd3" : "#bae6fd";
}

function isYouTubeUrl(url) {
  return /^https:\/\/(youtube\.com|www\.youtube\.com|music\.youtube\.com)\//i.test(String(url || ""));
}

async function getActiveYouTubeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id && isYouTubeUrl(tab.url) ? tab : null;
}

async function getYouTubeTabs() {
  const tabs = await chrome.tabs.query({ url: TARGET_URLS });
  const unique = new Map();
  for (const tab of tabs) if (tab.id && isYouTubeUrl(tab.url)) unique.set(tab.id, tab);
  return [...unique.values()];
}

function send(tabId, payload) {
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tabId, payload, response => {
      if (chrome.runtime.lastError) return resolve({ ok: false, error: chrome.runtime.lastError.message });
      resolve({ ok: Boolean(response?.ok), response });
    });
  });
}

async function inject(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return true;
  } catch (error) {
    console.warn("[YT-IAP] inject failed", error);
    return false;
  }
}

async function applyToTab(tab, settings, force = false) {
  if (force) await inject(tab.id);
  let result = await send(tab.id, { type: "YT_IAP_APPLY", settings });
  if (!result.ok) {
    if (!(await inject(tab.id))) return false;
    await new Promise(resolve => setTimeout(resolve, 180));
    result = await send(tab.id, { type: "YT_IAP_APPLY", settings });
  }
  return result.ok;
}

function read() {
  const settings = { ...current };
  for (const id of FIELD_IDS) {
    const node = el[id];
    if (!node) continue;
    if (node.type === "checkbox") settings[id] = node.checked;
    else if (node.type === "range") settings[id] = Number(node.value);
    else settings[id] = node.value;
  }
  return settings;
}

function write(settings) {
  current = { ...DEFAULTS, ...(settings || {}) };
  for (const id of FIELD_IDS) {
    const node = el[id];
    if (!node) continue;
    if (node.type === "checkbox") node.checked = Boolean(current[id]);
    else node.value = current[id];
  }
  if (el.wallpaperName) el.wallpaperName.textContent = current.wallpaperName ? `Local: ${current.wallpaperName}` : "No local wallpaper.";
  el.statusDot?.classList.toggle("off", !current.enabled);
}

async function save(settings) {
  current = { ...DEFAULTS, ...settings };

  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: current });
    el.statusDot?.classList.toggle("off", !current.enabled);
    return true;
  } catch (error) {
    const message = String(error?.message || error || "");

    if (/quota|kQuotaBytes|QUOTA/i.test(message)) {
      current.wallpaperDataUrl = "";
      current.wallpaperName = "";
      current.wallpaperEnabled = false;

      await chrome.storage.local.set({ [STORAGE_KEY]: current }).catch(() => null);

      write(current);
      setMsg("Wallpaper too large for Chrome storage. Use smaller image / URL.", true);
      return false;
    }

    setMsg(message || "Failed to save settings.", true);
    return false;
  }
}

async function applyActive(force = false) {
  const settings = read();
  if (!(await save(settings))) return;
  const tab = await getActiveYouTubeTab();
  if (!tab) return setMsg("Open YouTube tab first.", true);
  const ok = await applyToTab(tab, settings, force);
  setMsg(ok ? "Applied." : "Apply failed. Reload extension + YouTube.", !ok);
}

async function forceAll() {
  const settings = read();
  if (!(await save(settings))) return;
  const tabs = await getYouTubeTabs();
  let ok = 0;
  for (const tab of tabs) if (await applyToTab(tab, settings, true)) ok++;
  setMsg(`Force injected ${ok}/${tabs.length} tab(s).`, ok === 0);
}

function queueLive() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(async () => {
    const settings = read();
    if (!(await save(settings))) return;
    const tab = await getActiveYouTubeTab();
    if (tab) await applyToTab(tab, settings, false);
  }, 180);
}

function syncColors() {
  const theme = el.theme?.value || "youtubeDefault";
  const colors = PRESET_COLORS[theme] || PRESET_COLORS.youtubeDefault;
  if (el.accent) el.accent.value = colors.accent;
  if (el.bg) el.bg.value = colors.bg;
  if (el.text) el.text.value = colors.text;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image."));
    img.src = src;
  });
}

async function compressImage(file) {
  const maxRawBytes = 50 * 1024 * 1024;
  const maxStoredChars = 7 * 1024 * 1024;

  if (file.size > maxRawBytes) {
    throw new Error("Image too large. Use <= 50MB.");
  }

  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    const dataUrl = await fileToDataUrl(file);

    if (dataUrl.length > maxStoredChars) {
      throw new Error("GIF/SVG too large for safe storage. Use JPG/PNG/WebP.");
    }

    return dataUrl;
  }

  const originalDataUrl = await fileToDataUrl(file);
  const img = await loadImage(originalDataUrl);

  const canvas = document.createElement("canvas");
  let maxSide = 2560;

  while (maxSide >= 1280) {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38]) {
      const output = canvas.toDataURL("image/jpeg", quality);

      if (output.length <= maxStoredChars) {
        return output;
      }
    }

    maxSide -= 320;
  }

  throw new Error("Compressed image still too large. Use smaller wallpaper.");
}

function bindEvents() {
  qs("apply")?.addEventListener("click", () => applyActive(false));
  qs("force")?.addEventListener("click", () => forceAll());
  qs("reset")?.addEventListener("click", async () => { write(DEFAULTS); await applyActive(true); });
  qs("reloadTabs")?.addEventListener("click", async () => {
    const tabs = await getYouTubeTabs();
    for (const tab of tabs) {
      try { await chrome.tabs.reload(tab.id, { bypassCache: true }); } catch {}
    }
    setMsg(`Reloaded ${tabs.length} tab(s).`);
  });
  qs("scan")?.addEventListener("click", async () => {
    const tabs = await getYouTubeTabs();
    let ok = 0;
    for (const tab of tabs) {
      const res = await send(tab.id, { type: "YT_IAP_SCAN" });
      if (res.ok) ok++;
    }
    setMsg(`Anti-pause scan ${ok}/${tabs.length} tab(s).`);
  });
  qs("syncColors")?.addEventListener("click", () => { syncColors(); queueLive(); });
  qs("clearWallpaper")?.addEventListener("click", async () => {
    const settings = read();
    settings.wallpaperEnabled = false;
    settings.wallpaperUrl = "";
    settings.wallpaperDataUrl = "";
    settings.wallpaperName = "";
    write(settings);
    await applyActive(false);
  });
  el.wallpaperFile?.addEventListener("change", async () => {
    const file = el.wallpaperFile.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg("Invalid image.", true);
    try {
      setMsg("Processing wallpaper...");
      const settings = read();
      settings.wallpaperDataUrl = await compressImage(file);
      settings.wallpaperName = file.name;
      settings.wallpaperEnabled = true;
      write(settings);
      await applyActive(false);
      setMsg("Wallpaper applied.");
    } catch (err) {
      setMsg(err.message || "Wallpaper failed.", true);
    }
  });
  el.theme?.addEventListener("change", () => {
    syncColors();
    if (el.customColors) el.customColors.checked = false;
    queueLive();
  });
  el.customColors?.addEventListener("change", () => {
    if (el.customColors.checked) syncColors();
    queueLive();
  });
  for (const node of Object.values(el)) {
    if (!node || node.id === "theme" || node.id === "customColors") continue;
    node.addEventListener("change", queueLive);
    if (node.type === "range" || node.tagName === "TEXTAREA" || node.type === "color") node.addEventListener("input", queueLive);
  }
}

async function init() {
  bootElements();
  bindEvents();
  const data = await chrome.storage.local.get({ [STORAGE_KEY]: DEFAULTS });
  write(data[STORAGE_KEY] || DEFAULTS);
  setMsg("Ready.");
}

document.addEventListener("DOMContentLoaded", init, { once: true });
if (document.readyState !== "loading") init();
