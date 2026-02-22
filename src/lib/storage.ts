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

export type Settings = {
  baseUrl: string;
  apiKey: string;
  enableRemoteUploadEmbeddedButton: boolean;
};

const SETTINGS_KEYS = [
  "baseUrl",
  "apiKey",
  "enableRemoteUploadEmbeddedButton",
] as const;

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get([...SETTINGS_KEYS, "token"]);
  const baseUrl = (data.baseUrl || "").replace(/\/+$/, "");
  const apiKey = data.apiKey || data.token || "";
  const enableRemoteUploadEmbeddedButton =
    data.enableRemoteUploadEmbeddedButton === true;
  if (data.token && !data.apiKey) {
    await chrome.storage.sync.set({ apiKey });
    await chrome.storage.sync.remove(["token"]);
  }
  return { baseUrl, apiKey, enableRemoteUploadEmbeddedButton };
}

export async function saveSettings(s: Partial<Settings>) {
  const patch: Record<string, unknown> = {};

  if (typeof s.baseUrl === "string") {
    patch.baseUrl = s.baseUrl.replace(/\/+$/, "");
  }

  if (typeof s.apiKey === "string") {
    patch.apiKey = s.apiKey;
  }

  if (typeof s.enableRemoteUploadEmbeddedButton === "boolean") {
    patch.enableRemoteUploadEmbeddedButton = s.enableRemoteUploadEmbeddedButton;
  }

  if (Object.keys(patch).length > 0) {
    await chrome.storage.sync.set(patch);
  }
}

export async function clearSettings() {
  await chrome.storage.sync.remove([...SETTINGS_KEYS]);
}
