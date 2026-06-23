# YouTube Focus Combo

> Focus mode, theme injection, wallpaper, ad cleanup, and safe continue-watching clicker.

A Chrome extension that declutters YouTube, adds dark custom themes, wallpaper overlay, and automatically dismisses "continue watching" dialogs.

## Features

### Focus Tools
- Hide comments, sidebar, Shorts, home feed, end screen, player overlays
- Cinema-width player (max 1280px with rounded corners)
- Clean player UI

### Theme Engine
7 preset themes or fully custom colors:
| Theme | Description |
|-------|------------|
| **Dark Red** | Warm crimson tones |
| **Midnight Blue** | Deep ocean blues |
| **Purple Neon** | Electric purples |
| **Light Blue Sea** | Cyan/teal accents |
| **Lime Forest** | Green tones |
| **Black Glass** | Frosted dark glass |
| **YouTube Default** | Default YouTube appearance |

Custom Colors toggle lets you pick accent, background, and text color independently.

### Wallpaper
- Set an image URL as page background
- Upload a local image (auto-compressed for Chrome storage)
- Controls: opacity, blur, dim

### Ad Cleaner
- **Normal** – hides standard ad slots
- **Aggressive** – also removes sponsored sections in the feed

### Anti Pause Safe
Automatically clicks "Continue watching" / "Are you still watching?" dialogs. Only clicks visible confirmation buttons — does not click hidden or off-screen elements.

### Custom CSS
- Paste raw CSS in the popup textarea (with toggle)
- **Folder CSS** – Dropdown selector that loads `.css` files from `custom-css/` folder. Drop a new file in `custom-css/`, add its name to `index.json`, and pick it from the dropdown.

### Sidebar / Playlist Panel Theming
`forceTheme()` applies inline `!important` styles to `ytd-playlist-panel-renderer`, playlist items, compact video/radio/playlist renderers, and section headers — works even after YouTube SPA navigation via a debounced `MutationObserver`.

## Installation

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the extension folder

## Usage

Click the toolbar icon to open the popup. Toggle features on/off and click **Apply**. Use **Force Inject** to re-inject the content script into all open YouTube tabs.

## File Structure

```
yt-focus-ext/
├── content.js        # Main content script (CSS injection, theme, observer, messaging)
├── manifest.json     # Extension manifest (MV3)
├── popup.html        # Popup UI
├── popup.js          # Popup logic (settings, messaging, wallpaper)
├── popup.css         # Popup styles
├── yt-mix-page.html  # Debug page (YouTube Mix HTML snapshot)
├── icons/
│   └── icon.svg      # Extension icon
└── custom-css/
    ├── index.json    # File manifest (list of available CSS files)
    └── rgb-progressbar.css  # Example: RGB animated progress bar
```

## Custom CSS Folder

Drop `.css` files into `custom-css/`, list them in `index.json`:

```json
["rgb-progressbar.css", "my-theme.css"]
```

Then select from the **Folder CSS** dropdown in the popup.

## License

GPL-3.0-or-later — see file headers for details.

Copyright (C) 2026 Faa Ramadhan
