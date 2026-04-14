/*
 *   Copyright (c) 2026 Laith Alkhaddam aka Iconical.
 *   All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { setButtonState } from "./button-state";

type MessageResponse = { ok?: boolean; queued?: boolean; error?: string };

function sendUploadMessage(targetUrl: string, title: string) {
  return new Promise<MessageResponse>((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "swush:add-remote-upload",
        url: targetUrl,
        title,
      },
      (response: MessageResponse) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response || { ok: false, error: "Unknown extension error" });
      },
    );
  });
}

function resetButtonStateLater(button: HTMLButtonElement, delayMs: number) {
  window.setTimeout(() => setButtonState(button, "idle"), delayMs);
}

export async function runUploadFlow(
  button: HTMLButtonElement,
  targetUrl: string,
  title: string,
) {
  setButtonState(button, "loading");
  const response = await sendUploadMessage(targetUrl, title);
  if (response.ok) {
    setButtonState(button, response.queued ? "queued" : "ok");
    resetButtonStateLater(button, 1600);
    return;
  }

  setButtonState(button, "error");
  resetButtonStateLater(button, 1800);
}
