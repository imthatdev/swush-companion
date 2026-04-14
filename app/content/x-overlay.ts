/*
 *   Copyright (c) 2026 Laith Alkhaddam aka Iconical.
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

import {
  SITE_WHITELIST_STORAGE_KEY,
  isHostWhitelisted,
  normalizeDomain,
} from "../storage/site-whitelist";
import { ENABLE_REMOTE_UPLOAD_EMBEDDED_BUTTON_KEY } from "../lib/storage";
import { startContextualUploadInjection } from "./ui-injection/engine";

let disposeEngine: null | (() => void) = null;

async function isInjectionEnabledForCurrentHost() {
  const host = normalizeDomain(window.location.hostname);
  if (!host) return false;

  const settings = await chrome.storage.sync.get([
    ENABLE_REMOTE_UPLOAD_EMBEDDED_BUTTON_KEY,
  ]);
  const masterEnabled =
    settings[ENABLE_REMOTE_UPLOAD_EMBEDDED_BUTTON_KEY] !== false;
  if (!masterEnabled) return false;

  return isHostWhitelisted(host);
}

async function syncInjectionState() {
  const allowed = await isInjectionEnabledForCurrentHost();

  if (!allowed) {
    if (disposeEngine) {
      disposeEngine();
      disposeEngine = null;
    }
    return;
  }

  if (disposeEngine) return;

  disposeEngine = startContextualUploadInjection();
}

void syncInjectionState();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (
    changes[SITE_WHITELIST_STORAGE_KEY] ||
    changes[ENABLE_REMOTE_UPLOAD_EMBEDDED_BUTTON_KEY]
  ) {
    void syncInjectionState();
  }
});

window.addEventListener("focus", () => {
  void syncInjectionState();
});
