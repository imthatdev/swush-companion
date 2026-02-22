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

import {
  addBookmark,
  addNote,
  uploadFileBlob,
  shortenLink,
  addRemoteUpload,
} from "./lib/api";

chrome.runtime.onInstalled.addListener(() => {
  void createContextMenus();
});

chrome.runtime.onStartup?.addListener(() => {
  void createContextMenus();
});

async function createContextMenus() {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: "swush_root",
    title: "Swush",
    contexts: ["all"],
  });

  chrome.contextMenus.create({
    id: "swush_bookmark",
    parentId: "swush_root",
    title: "Save bookmark",
    contexts: ["page", "link"],
  });

  chrome.contextMenus.create({
    id: "swush_note",
    parentId: "swush_root",
    title: "Save note from selection",
    contexts: ["selection", "page"],
  });

  chrome.contextMenus.create({
    id: "swush_shorten",
    parentId: "swush_root",
    title: "Create short link",
    contexts: ["page", "link"],
  });

  chrome.contextMenus.create({
    id: "swush_separator_media",
    parentId: "swush_root",
    type: "separator",
    contexts: ["all"],
  });

  chrome.contextMenus.create({
    id: "swush_upload_image",
    parentId: "swush_root",
    title: "Upload image",
    contexts: ["image"],
  });

  chrome.contextMenus.create({
    id: "swush_remote_upload_video",
    parentId: "swush_root",
    title: "Add to remote upload",
    contexts: ["video", "link"],
    targetUrlPatterns: [
      "*://*/*.mp4*",
      "*://*/*.mov*",
      "*://*/*.mkv*",
      "*://*/*.webm*",
      "*://*/*.avi*",
      "*://*/*.m4v*",
      "*://*.youtube.com/*",
      "*://youtu.be/*",
      "*://*.vimeo.com/*",
      "*://*.twitch.tv/*",
      "*://x.com/*/status/*",
      "*://*.x.com/*/status/*",
      "*://twitter.com/*/status/*",
      "*://*.twitter.com/*/status/*",
    ],
  });
}

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
    } else if (info.menuItemId === "swush_remote_upload_video") {
      const targetUrl = pickRemoteUploadTargetUrl(info, tab?.url || "");
      if (!targetUrl) throw new Error("No target URL");
      if (!isLikelyVideoUrl(targetUrl)) {
        throw new Error("This link does not look like a video/status URL");
      }

      await addRemoteUpload(targetUrl, tab?.title || "Remote video");
      notify("Added to remote upload");
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "swush:add-remote-upload") return;

  const url = typeof message.url === "string" ? message.url : "";
  const title =
    typeof message.title === "string" && message.title.trim()
      ? message.title.trim()
      : "Remote upload";

  if (!isLikelyRemoteUploadUrl(url)) {
    sendResponse({ ok: false, error: "Unsupported page URL" });
    return;
  }

  void (async () => {
    try {
      await addRemoteUpload(url, title);
      notify("Added to remote upload");
      sendResponse({ ok: true });
    } catch (e: any) {
      sendResponse({ ok: false, error: e?.message || "Upload failed" });
    }
  })();

  return true;
});

function filename(u: string) {
  try {
    const p = new URL(u).pathname.split("/").pop() || "image";
    return p.includes(".") ? p : p + ".jpg";
  } catch {
    return "image.jpg";
  }
}

function isLikelyVideoUrl(url: string) {
  const lower = url.toLowerCase();
  const isStatusLink = (() => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const isXHost =
        host === "x. " ||
        host === "www.x.com" ||
        host.endsWith(".x.com") ||
        host === "twitter.com" ||
        host === "www.twitter.com" ||
        host.endsWith(".twitter.com");
      return isXHost && /\/[^/]+\/status\/\d+/i.test(parsed.pathname);
    } catch {
      return false;
    }
  })();

  return (
    /\.(mp4|mov|mkv|webm|avi|m4v)(\?|#|$)/.test(lower) ||
    lower.includes("youtube.com") ||
    lower.includes("youtu.be/") ||
    lower.includes("vimeo.com") ||
    lower.includes("twitch.tv") ||
    isStatusLink
  );
}

function isLikelyRemoteUploadUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return false;
  if (isLikelyVideoUrl(url)) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function pickRemoteUploadTargetUrl(
  info: chrome.contextMenus.OnClickData,
  tabUrl: string,
) {
  if (info.linkUrl) return info.linkUrl;

  const src = info.srcUrl || "";
  if (
    src &&
    /^https?:\/\//i.test(src) &&
    !src.toLowerCase().startsWith("blob:")
  ) {
    return src;
  }

  return info.pageUrl || tabUrl || "";
}

function notify(message: string) {
  chrome.notifications?.create?.({
    type: "basic",
    iconUrl: "icons/128.png",
    title: "Swush",
    message,
  });
}
