# Changelog

All notable changes to Swush Companion are documented in this file.

## 2.5.0 - 2026-04-14

### Added
- New contextual upload injection modules for cleaner separation of concerns:
  - `app/content/ui-injection/engine.ts`
  - `app/content/ui-injection/button-state.ts`
  - `app/content/ui-injection/upload-flow.ts`
  - `app/content/ui-injection/style-adapter.ts`
- New site detector modules split by platform and shared utilities:
  - `app/content/site-detectors/index.ts`
  - `app/content/site-detectors/types.ts`
  - `app/content/site-detectors/hosts.ts`
  - `app/content/site-detectors/utils.ts`
  - `app/content/site-detectors/youtube.ts`
  - `app/content/site-detectors/x.ts`
  - `app/content/site-detectors/reddit.ts`
  - `app/content/site-detectors/generic.ts`
- New performance helper: `app/content/performance/debounce.ts`.
- New site whitelist and queue storage modules:
  - `app/storage/site-whitelist.ts`
  - `app/storage/upload-queue.ts`
- New extension packaging scripts:
  - `scripts/export-chrome.mjs`
  - `scripts/export-firefox.mjs`
- New extension icon asset: `public/icons/logo.png`.
- New global Chrome types declaration for editor/type tooling: `app/globals.d.ts`.
- Copyright and Apache 2.0 headers added across extension source files.

### Changed
- Project source tree migrated from `src/*` to `app/*` (popup, options, background, content, libs, and styles).
- Content script bootstrap now uses `app/content/x-overlay.ts` with modular injection startup.
- Build config and manifest wiring updated in `vite.config.ts` to point to `app/*` paths.
- Manifest permissions and resources updated to support alarm-based retry and web-accessible icon assets.
- Popup and options pages moved to:
  - `app/popup.html`
  - `app/options.html`
- Package scripts expanded for browser-specific build/export/zip workflows:
  - `build:chrome`, `build:firefox`, `build:extensions`
  - `zip:chrome`, `zip:firefox`, `zip:extensions`, `zip:source`
  - `lint:firefox`, `release:firefox`

### Improved
- Better runtime performance and DOM stability for embedded upload actions via:
  - debounced placement sync
  - modularized placement detection
  - improved X dropdown handling
  - shared button-state and upload-flow handling

### Removed
- Legacy files retired after migration/refactor:
  - `src/content/x-overlay.ts`
  - `src/options.html`
  - `src/popup.html`

### Notes
- Unpacked extension load paths are now browser-specific:
  - Chrome: `extensions/chrome`
  - Firefox/Zen: `extensions/firefox`
