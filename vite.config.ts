/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical.
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at

 *   http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import path from "node:path";

const manifest = {
  manifest_version: 3,
  name: "Swush Companion",
  description:
    "Shorten links, upload files/images, add notes/bookmarks to Swush.",
  version: "2.1.1",
  action: { default_title: "Swush", default_popup: "src/popup.html" },
  options_page: "src/options.html",
  background: { service_worker: "src/background.ts", type: "module" },
  icons: {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png",
  },
  permissions: [
    "storage",
    "activeTab",
    "scripting",
    "contextMenus",
    "notifications",
  ],
  host_permissions: ["<all_urls>"],
  commands: {
    "swush-quick-bookmark": {
      suggested_key: { default: "Alt+B" },
      description: "Add current tab as bookmark",
    },
    "swush-quick-note": {
      suggested_key: { default: "Alt+N" },
      description: "Add selected text as a note",
    },
    "swush-quick-upload": {
      suggested_key: { default: "Alt+U" },
      description: "Upload a file/image",
    },
  },
};

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      input: {
        popup: "src/popup.html",
        options: "src/options.html",
      },
    },
  },
});
