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

const STORAGE_KEY = "ytFocusAntiPauseComboV13";
const OLD_STORAGE_KEY = "ytInjectAntiPauseV12";
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

const PRESETS = {
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
let liveTimer = 0;
let started = false;

function byId(id) {
  return document.getElementById(id);
}

function setMsg(text, bad = false) {
  el.msg.textContent = text;
  el.msg.style.color = bad ? "#fecdd3" : "#bae6fd";
}

function normalize(value) {
  return { ...DEFAULTS, ...(value || {}) };
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
  return [...new Map(tabs.filter(tab => tab.id && isYouTubeUrl(tab.url)).map(tab => [tab.id, tab])).values()];
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
    console.warn("[YT Focus Combo] inject failed", error);
    return false;
  }
}

async function applyToTab(tab, settings, force = false) {
  if (force) await inject(tab.id);
  let result = await send(tab.id, { type: "YT_FOCUS_COMBO_APPLY", settings });
  if (!result.ok) {
    if (!(await inject(tab.id))) return false;
    await new Promise(resolve => setTimeout(resolve, 180));
    result = await send(tab.id, { type: "YT_FOCUS_COMBO_APPLY", settings });
  }
  return result.ok;
}

function readForm() {
  const settings = { ...current };
  for (const id of FIELD_IDS) {
    const node = el[id];
    if (!node) continue;
    if (node.type === "checkbox") settings[id] = node.checked;
    else if (node.type === "range") settings[id] = Number(node.value);
    else settings[id] = node.value;
  }
  return normalize(settings);
}

function writeForm(settings) {
  current = normalize(settings);
  for (const id of FIELD_IDS) {
    const node = el[id];
    if (!node) continue;
    if (node.type === "checkbox") node.checked = Boolean(current[id]);
    else node.value = current[id];
  }
  el.wallpaperName.textContent = current.wallpaperName ? `Local: ${current.wallpaperName}` : "No local wallpaper.";
  el.statusDot.classList.toggle("off", !current.enabled);
}

async function save(settings) {
  current = normalize(settings);
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: current });
    el.statusDot.classList.toggle("off", !current.enabled);
    return true;
  } catch (error) {
    const message = String(error?.message || error || "");
    if (/quota|kQuotaBytes|QUOTA/i.test(message)) {
      current.wallpaperDataUrl = "";
      current.wallpaperName = "";
      current.wallpaperEnabled = false;
      await chrome.storage.local.set({ [STORAGE_KEY]: current }).catch(() => null);
      writeForm(current);
      setMsg("Wallpaper too large for Chrome storage.", true);
      return false;
    }
    setMsg(message || "Failed to save settings.", true);
    return false;
  }
}

async function applyActive(force = false) {
  const settings = readForm();
  if (!(await save(settings))) return;
  const tab = await getActiveYouTubeTab();
  if (!tab) return setMsg("Open a YouTube tab first.", true);
  const ok = await applyToTab(tab, settings, force);
  setMsg(ok ? "Applied." : "Apply failed. Reload YouTube and try Force Inject.", !ok);
}

async function forceAll() {
  const settings = readForm();
  if (!(await save(settings))) return;
  const tabs = await getYouTubeTabs();
  let ok = 0;
  for (const tab of tabs) if (await applyToTab(tab, settings, true)) ok++;
  setMsg(`Force injected ${ok}/${tabs.length} tab(s).`, ok === 0);
}

function queueLive() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(async () => {
    const settings = readForm();
    if (!(await save(settings))) return;
    const tab = await getActiveYouTubeTab();
    if (tab) await applyToTab(tab, settings, false);
  }, 180);
}

function syncColors() {
  const preset = PRESETS[el.theme.value] || PRESETS.youtubeDefault;
  el.accent.value = preset.accent;
  el.bg.value = preset.bg;
  el.text.value = preset.text;
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
  if (file.size > maxRawBytes) throw new Error("Image too large. Use <= 50MB.");
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    const dataUrl = await fileToDataUrl(file);
    if (dataUrl.length > maxStoredChars) throw new Error("GIF/SVG too large for storage.");
    return dataUrl;
  }

  const img = await loadImage(await fileToDataUrl(file));
  const canvas = document.createElement("canvas");
  for (let maxSide = 2560; maxSide >= 1280; maxSide -= 320) {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38]) {
      const output = canvas.toDataURL("image/jpeg", quality);
      if (output.length <= maxStoredChars) return output;
    }
  }
  throw new Error("Compressed image still too large.");
}

function bindEvents() {
  byId("apply").addEventListener("click", () => applyActive(false));
  byId("force").addEventListener("click", () => forceAll());
  byId("reset").addEventListener("click", async () => {
    writeForm(DEFAULTS);
    await applyActive(true);
  });
  byId("reloadTabs").addEventListener("click", async () => {
    const tabs = await getYouTubeTabs();
    for (const tab of tabs) await chrome.tabs.reload(tab.id, { bypassCache: true }).catch(() => null);
    setMsg(`Reloaded ${tabs.length} tab(s).`);
  });
  byId("scan").addEventListener("click", async () => {
    const tabs = await getYouTubeTabs();
    let ok = 0;
    for (const tab of tabs) {
      const res = await send(tab.id, { type: "YT_FOCUS_COMBO_SCAN" });
      if (res.ok) ok++;
    }
    setMsg(`Anti-pause scan ${ok}/${tabs.length} tab(s).`);
  });
  byId("syncColors").addEventListener("click", () => {
    syncColors();
    queueLive();
  });
  byId("clearWallpaper").addEventListener("click", async () => {
    const settings = readForm();
    Object.assign(settings, { wallpaperEnabled: false, wallpaperUrl: "", wallpaperDataUrl: "", wallpaperName: "" });
    writeForm(settings);
    await applyActive(false);
  });
  el.wallpaperFile.addEventListener("change", async () => {
    const file = el.wallpaperFile.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg("Invalid image.", true);
    try {
      setMsg("Processing wallpaper...");
      const settings = readForm();
      settings.wallpaperDataUrl = await compressImage(file);
      settings.wallpaperName = file.name;
      settings.wallpaperEnabled = true;
      writeForm(settings);
      await applyActive(false);
      setMsg("Wallpaper applied.");
    } catch (error) {
      setMsg(error?.message || "Wallpaper failed.", true);
    }
  });
  el.theme.addEventListener("change", () => {
    syncColors();
    el.customColors.checked = false;
    queueLive();
  });
  el.customColors.addEventListener("change", queueLive);
  for (const id of FIELD_IDS) {
    const node = el[id];
    if (!node || node === el.theme || node === el.customColors) continue;
    node.addEventListener("change", queueLive);
    if (node.type === "range" || node.type === "color" || node.tagName === "TEXTAREA") node.addEventListener("input", queueLive);
  }
}

async function loadSettings() {
  const data = await chrome.storage.local.get({ [STORAGE_KEY]: null, [OLD_STORAGE_KEY]: null });
  const settings = normalize(data[STORAGE_KEY] || data[OLD_STORAGE_KEY] || DEFAULTS);
  await chrome.storage.local.set({ [STORAGE_KEY]: settings }).catch(() => null);
  return settings;
}

async function init() {
  if (started) return;
  started = true;
  for (const id of FIELD_IDS) el[id] = byId(id);
  el.msg = byId("msg");
  el.statusDot = byId("statusDot");
  el.wallpaperFile = byId("wallpaperFile");
  el.wallpaperName = byId("wallpaperName");
  bindEvents();
  writeForm(await loadSettings());
  setMsg("Ready.");
}

document.addEventListener("DOMContentLoaded", init, { once: true });
if (document.readyState !== "loading") init();
