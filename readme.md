# Swush Companion 🪄💜

The official browser extension for [Swush](https://iconical.dev/web/swush) - your all-in-one productivity hub. Capture, save, and organize your digital world directly from your browser.

> [!NOTE]
> This extension lets you quickly manage content with hotkeys
> - Alt + B to save the current tab as a bookmark
> - Alt + N to capture selected text as a note
> - Alt + U to instantly upload a file or image.

![Version](https://img.shields.io/github/v/release/imthatdev/swush-companion?style=for-the-badge)
![Downloads](https://img.shields.io/github/downloads/imthatdev/swush-companion/total?style=for-the-badge)
![License](https://img.shields.io/github/license/imthatdev/swush-companion?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/imthatdev/swush-companion?style=for-the-badge)

[![Install Extension](https://img.shields.io/badge/Install-Chrome_Extension-blue?style=for-the-badge&logo=googlechrome)](https://chromewebstore.google.com/detail/swush-companion/jgipkeccibhgdfhoknfggljdmdodkjop)
[![Install Extension](https://img.shields.io/badge/Install-Firefox_Extension-orange?style=for-the-badge&logo=firefox)](https://addons.mozilla.org/en-US/firefox/addon/swush-companion/)

---

## ✨ Features
- 🔗 Shorten links on the fly with your Swush account
- 📝 Save notes instantly from any page
- 📌 Add bookmarks with one click
- 📂 Upload files or images
- 🌐 Add remote-upload URLs directly from the Upload tab
- 📋 Tiny Paste button for quick clipboard URL fill-in
- 🧠 Remembers the last active popup tab
- ⚡ Loading states/animations on action buttons
- 🧩 Inline "Upload to Swush" buttons on supported pages when enabled
- 🔒 Private & secure; everything is tied to your account, no 3rd-party sharing
- 🖱️ Context menu integration for quick actions
- 🪟 Popup for quick access and uploads

---

## 🚀 Installation
1. **Download** or **build** the extension (see Developer Guide below).
2. **Load** the extension in your browser:
   - Chrome: Go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", and select `/extensions/chrome`.
	- Firefox: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and choose `/extensions/firefox/manifest.json`.
	- Zen (Firefox-based): Use `about:debugging#/runtime/this-firefox` and load `/extensions/firefox/manifest.json` the same way.

---

## ⚙️ Setup & Login (Device Flow)
1. **Open the Options page** of the extension.
2. **Enter your Swush instance URL** (e.g. `https://your-app.com`).
3. **Click "Connect"** to start the device flow.
4. A new tab opens in Swush. **Approve the device** by entering the code shown in the extension.
5. The extension polls and **saves a fresh API key** automatically.

### ✅ Required for official app setups (CORS)

If you use the extension with your own Swush app instance, add your extension origin to the app CORS allowlist:

- `chrome-extension://<EXTENSION_ID>`
- `moz-extension://<EXTENSION_UUID>`

You can find `<EXTENSION_ID>` in `chrome://extensions`, and `<EXTENSION_UUID>` in `about:debugging#/runtime/this-firefox`.

If this origin is missing, extension API calls can fail with `403` / `Origin not allowed`.

---

## 🛡️ Permissions
- `storage` – Saves your settings (API key + base URL)
- `activeTab` – Grabs current tab info for saving links/bookmarks
- `scripting` – Context menu integration
- `notifications` – Shows success/error messages
- `contextMenus` – Adds Swush actions to right-click menu
- `clipboardRead` – Lets the Upload tab Paste button read URL text from clipboard
- `clipboardWrite` – Copies generated/uploaded links for convenience
- `host_permissions` – Allows API calls to your Swush instance

---

## 🧑‍💻 Usage
- Context Menu
	- Right-click on a page, link, image, or selected text to:
		- Add bookmark
		- Add note (from selection)
		- Shorten link
		- Upload image
		- Add remote upload for supported links/media
- Popup
	- Click the Swush icon in your browser toolbar for quick actions:
		- Add bookmark for current tab
		- Add note
		- Upload file/image
		- Add a remote-upload URL (with optional Paste from clipboard)
	- Popup remembers your last active tab between opens.
- Options Page
	- Configure your Swush instance URL and connect via device flow.
	- (Optional) Paste an API key manually.
	- Enable inline on-page "Add to Swush" button injection.

---

## 🛠️ Developer Guide
- Project Structure
	- app – Extension source code (formerly src)
	- extensions/chrome – Generated Chrome package (load unpacked from here)
	- extensions/firefox – Generated Firefox/Zen package
	- background.ts – Service worker, context menu, and background logic
	- popup – Popup UI (React)
	- options – Options/settings UI (React)
	- api.ts – API integration with Swush backend
	- storage.ts – Settings storage (Chrome sync)
	- public – Icons and static assets
- Scripts
	- npm run dev – Start development server (Vite)
	- npm run build – Build base bundle into dist (internal build output)
	- npm run build:chrome – Generate /extensions/chrome from dist
	- npm run build:firefox – Generate /extensions/firefox from dist
	- npm run build:extensions – Generate both /extensions/chrome and /extensions/firefox
	- npm run zip – Build and zip for release
	- npm run zip:chrome – Build Chrome package zip
	- npm run zip:firefox – Build Firefox package zip
	- npm run zip:extensions – Build both browser zips
- Build
	- npm install
	- npm run build:extensions
	- Load /extensions/chrome or /extensions/firefox depending on your browser
- Contributing
	- PRs welcome! Please build and test before submitting.
	- Issues and feature requests: GitHub Issues

---

## 🐞 Troubleshooting

### Device Flow Issues

- If the approval page does not open:
   - Make sure popups are allowed for the extension.
- If the code expires:
   - Click **Connect** again to generate a fresh device code.
- If the extension can't connect:
   - Verify the base URL is correct and reachable.

If you still have issues, check your browser's extension permissions and console for errors, or open an issue on GitHub.

---

APACHE 2.0 © 2026 Laith (iconical)
