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
import { getSettings } from "./lib/storage";
import {
  enqueueRemoteUpload,
  getQueuedRemoteUploads,
  setQueuedRemoteUploads,
  type QueuedRemoteUpload,
} from "./storage/upload-queue";

const REMOTE_UPLOAD_RETRY_ALARM = "swush-remote-upload-retry";
const MAX_REMOTE_UPLOAD_RETRIES = 5;
let queueFlushInFlight = false;

chrome.runtime.onInstalled.addListener(() => {
  void createContextMenus();
  void flushRemoteUploadQueue();
  scheduleRemoteUploadRetry();
});

chrome.runtime.onStartup?.addListener(() => {
  void createContextMenus();
  void flushRemoteUploadQueue();
  scheduleRemoteUploadRetry();
});

chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name !== REMOTE_UPLOAD_RETRY_ALARM) return;
  void flushRemoteUploadQueue();
});

function scheduleRemoteUploadRetry() {
  chrome.alarms?.create(REMOTE_UPLOAD_RETRY_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: 4,
  });
}

function isLikelyNetworkError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message || "",
  ).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("temporarily")
  );
}

async function ensureConnected() {
  const settings = await getSettings();
  return Boolean(settings.baseUrl && settings.apiKey);
}

async function queueRemoteUpload(url: string, title: string) {
  await enqueueRemoteUpload(url, title);
  scheduleRemoteUploadRetry();
}

async function runRemoteUpload(url: string, title: string) {
  const connected = await ensureConnected();
  if (!connected) {
    throw new Error("Not connected. Open extension settings to sign in.");
  }

  return addRemoteUpload(url, title);
}

async function flushRemoteUploadQueue() {
  if (queueFlushInFlight) return;
  queueFlushInFlight = true;

  try {
    const connected = await ensureConnected();
    if (!connected) return;

    const queue = await getQueuedRemoteUploads();
    if (queue.length === 0) return;

    const next: QueuedRemoteUpload[] = [];

    for (const item of queue) {
      try {
        await addRemoteUpload(item.url, item.title);
      } catch (error) {
        if (
          isLikelyNetworkError(error) &&
          item.attempts + 1 < MAX_REMOTE_UPLOAD_RETRIES
        ) {
          next.push({ ...item, attempts: item.attempts + 1 });
          continue;
        }

        if (!isLikelyNetworkError(error)) {
          notify(
            "Swush queue item failed: " +
              String(
                (error as { message?: string })?.message || "Unknown error",
              ),
          );
        }
      }
    }

    await setQueuedRemoteUploads(next);

    if (next.length === 0) {
      chrome.alarms?.clear(REMOTE_UPLOAD_RETRY_ALARM);
    } else {
      scheduleRemoteUploadRetry();
    }
  } finally {
    queueFlushInFlight = false;
  }
}

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
    id: "swush_send_to_swush",
    parentId: "swush_root",
    title: "Send to Swush",
    contexts: ["page", "link", "image", "video"],
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

      try {
        await runRemoteUpload(targetUrl, tab?.title || "Remote video");
        notify("Added to remote upload");
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          await queueRemoteUpload(targetUrl, tab?.title || "Remote video");
          notify("Offline. Added to queue.");
        } else {
          throw error;
        }
      }
    } else if (info.menuItemId === "swush_send_to_swush") {
      const targetUrl = pickRemoteUploadTargetUrl(info, tab?.url || "");
      if (!targetUrl) throw new Error("No target URL");

      try {
        await runRemoteUpload(targetUrl, tab?.title || "Remote upload");
        notify("Added to remote upload");
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          await queueRemoteUpload(targetUrl, tab?.title || "Remote upload");
          notify("Offline. Added to queue.");
        } else {
          throw error;
        }
      }
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
      await runRemoteUpload(url, title);
      notify("Added to remote upload");
      sendResponse({ ok: true, queued: false });
    } catch (e: any) {
      if (isLikelyNetworkError(e)) {
        await queueRemoteUpload(url, title);
        notify("Offline. Added to queue.");
        sendResponse({ ok: true, queued: true });
        return;
      }

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
        host === "x.com" ||
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
