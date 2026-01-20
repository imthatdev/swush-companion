# Swush Companion 🪄💜

The official browser extension for [Swush](https://iconical.dev) – your all-in-one productivity hub. Capture, save, and organize your digital world directly from your browser.

<<<<<<< Updated upstream
> [!NOTE]
> This extension lets you quickly manage content with hotkeys
> - Alt + B to save the current tab as a bookmark
> - Alt + N to capture selected text as a note
> - Alt + U to instantly upload a file or image.

=======
>>>>>>> Stashed changes
---

## ✨ Features
- 🔗 Shorten links on the fly with your Swush account
- 📝 Save notes instantly from any page
- 📌 Add bookmarks with one click
- 📂 Upload files or images
- 🔒 Private & secure – everything is tied to your account, no 3rd-party sharing
- 🖱️ Context menu integration for quick actions
- 🪟 Popup for quick access and uploads

---

## 🚀 Installation
1. **Download** or **build** the extension (see Developer Guide below).
2. **Load** the extension in your browser:
   - Chrome: Go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", and select the `dist` folder.
   - Firefox: Go to `about:debugging`, click "Load Temporary Add-on", and select the manifest file.

---

## ⚙️ Setup & Login
1. **Open the Options page** of the extension.
2. **Enter your Swush instance URL** (e.g. `https://your-app.com`).
3. **Click "Login with Swush"**. This will open a new tab to authenticate with your Swush account.
   - After login, the extension will automatically receive and save your API token.
4. (Optional) Adjust API endpoints if your instance uses custom paths.

<<<<<<< Updated upstream
---
=======
> **Note:** Swush is self-hosted. You must provide your own instance URL.
>>>>>>> Stashed changes

---

<<<<<<< Updated upstream
---
=======
## 🛡️ Permissions
- `storage` – Saves your settings (token, base URL, endpoints)
- `activeTab` – Grabs current tab info for saving links/bookmarks
- `scripting` – Context menu integration
- `notifications` – Shows success/error messages
- `contextMenus` – Adds Swush actions to right-click menu
- `host_permissions` – Allows API calls to your Swush instance
>>>>>>> Stashed changes

---

## 🧑‍💻 Usage

<<<<<<< Updated upstream
---
=======
### Context Menu
- **Right-click** on a page, link, image, or selected text to:
  - Add bookmark
  - Add note (from selection)
  - Shorten link
  - Upload image
>>>>>>> Stashed changes

### Popup
- Click the Swush icon in your browser toolbar for quick actions:
  - Add bookmark for current tab
  - Add note
  - Upload file/image

<<<<<<< Updated upstream
APACHE 2.0 © 2025 Laith (iconical)
=======
### Options Page
- Configure your Swush instance URL, login, and endpoints.
- View credits and support links.

---

## 🛠️ Developer Guide

### Project Structure
- `src/background.ts` – Service worker, context menu, and background logic
- `src/popup/` – Popup UI (React)
- `src/options/` – Options/settings UI (React)
- `src/lib/api.ts` – API integration with Swush backend
- `src/lib/storage.ts` – Settings storage (Chrome sync)
- `public/` – Icons and static assets

### Scripts
- `npm run dev` – Start development server (Vite)
- `npm run build` – Build extension for production
- `npm run zip` – Build and zip for release

### Build
1. `npm install`
2. `npm run build`
3. Load the `dist` folder as an unpacked extension

### Contributing
- PRs welcome! Please build and test before submitting.
- Issues and feature requests: [GitHub Issues](https://github.com/imthatdev/swush-companion/issues)

---

## 📜 License

Apache 2.0 © 2025-2026 Laith (Iconical)
>>>>>>> Stashed changes
