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

import { addBookmark, addNote, uploadFileBlob, shortenLink } from "./lib/api";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "swush_bookmark",
    title: "Swush: Add bookmark",
    contexts: ["page", "link"],
  });
  chrome.contextMenus.create({
    id: "swush_note",
    title: "Swush: Add note (selection)",
    contexts: ["selection", "page"],
  });
  chrome.contextMenus.create({
    id: "swush_shorten",
    title: "Swush: Shorten link",
    contexts: ["page", "link"],
  });
  chrome.contextMenus.create({
    id: "swush_upload_image",
    title: "Swush: Upload image",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === "swush_bookmark") {
      const url = info.linkUrl || info.pageUrl || tab?.url || "";
      const title = tab?.title || url;
      await addBookmark(url, title);
      notify("Bookmark added");
    } else if (info.menuItemId === "swush_note") {
      const content = info.selectionText || "";
      const pageUrl = info.pageUrl || tab?.url || "";
      await addNote(content, pageUrl);
      notify("Note added");
    } else if (info.menuItemId === "swush_shorten") {
      const url = info.linkUrl || info.pageUrl || tab?.url || "";
      await shortenLink(url);
      notify("Short link created");
    } else if (info.menuItemId === "swush_upload_image") {
      const srcUrl = info.srcUrl;
      if (!srcUrl) throw new Error("No image src");
      const r = await fetch(srcUrl).catch(() => null);
      if (!r || !r.ok) throw new Error("CORS blocked image");
      const blob = await r.blob();
      await uploadFileBlob(
        new File([blob], filename(srcUrl), { type: blob.type || "image/jpeg" }),
      );
      notify("Image uploaded");
    }
  } catch (e: any) {
    notify("Swush: " + e.message);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try {
    if (command === "swush-quick-bookmark") {
      await addBookmark(tab.url || "", tab.title || "");
      notify("Bookmark added");
    } else if (command === "swush-quick-note") {
      const [{ result: selection = "" } = {}] =
        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: () => window.getSelection()?.toString() || "",
        });
      await addNote(selection, tab.url || "");
      notify("Note added");
    } else if (command === "swush-quick-upload") {
      notify("Open popup → Upload to choose a file");
    }
  } catch (e: any) {
    notify("Swush: " + e.message);
  }
});

function filename(u: string) {
  try {
    const p = new URL(u).pathname.split("/").pop() || "image";
    return p.includes(".") ? p : p + ".jpg";
  } catch {
    return "image.jpg";
  }
}
function notify(message: string) {
  chrome.notifications?.create?.({
    type: "basic",
    iconUrl: "icons/128.png",
    title: "Swush",
    message,
  });
}
