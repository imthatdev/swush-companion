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
};

const SETTINGS_KEYS = ["baseUrl", "apiKey"] as const;

export async function getSettings(): Promise<Settings> {
  const data = await chrome.storage.sync.get([
    ...SETTINGS_KEYS,
    "token",
  ]);
  const baseUrl = (data.baseUrl || "").replace(/\/+$/, "");
  const apiKey = data.apiKey || data.token || "";
  if (data.token && !data.apiKey) {
    await chrome.storage.sync.set({ apiKey });
    await chrome.storage.sync.remove(["token"]);
  }
  return { baseUrl, apiKey };
}

export async function saveSettings(s: Settings) {
  await chrome.storage.sync.set({
    baseUrl: s.baseUrl.replace(/\/+$/, ""),
    apiKey: s.apiKey,
  });
}

export async function clearSettings() {
  await chrome.storage.sync.remove([...SETTINGS_KEYS]);
}
