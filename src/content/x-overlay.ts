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

const INLINE_BTN_CLASS = "swush-inline-upload-btn";
const INLINE_MARK_ATTR = "data-swush-inline-ready";
const LEGACY_FLOATING_ROOT_ID = "swush-embedded-upload-root";

let embeddedButtonEnabledCache: boolean | null = null;
let syncTimer: number | null = null;
let syncInFlight = false;
let lastMode: "x" | "youtube" | "generic" | null = null;

function isStatusPath(pathname: string) {
  return /\/[^/]+\/status\/\d+/i.test(pathname);
}

function isXHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "x.com" ||
    host === "www.x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host === "www.twitter.com" ||
    host.endsWith(".twitter.com")
  );
}

function isYouTubeHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "m.youtube.com" ||
    host.endsWith(".youtube.com")
  );
}

function cleanedUrl(input: string) {
  try {
    const parsed = new URL(input);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return input;
  }
}

function toAbsoluteHttpUrl(raw: string): string {
  try {
    const absolute = raw.startsWith("http")
      ? raw
      : new URL(raw, window.location.origin).toString();
    const parsed = new URL(absolute);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function removeLegacyFloating() {
  const root = document.getElementById(LEGACY_FLOATING_ROOT_ID);
  if (root) root.remove();
}

function removeInlineButtons() {
  document
    .querySelectorAll(`.${INLINE_BTN_CLASS}`)
    .forEach((node) => node.remove());
  document
    .querySelectorAll<HTMLElement>(`[${INLINE_MARK_ATTR}="1"]`)
    .forEach((node) => node.removeAttribute(INLINE_MARK_ATTR));
}

function removeInlineButtonsByKind(kind: string) {
  document
    .querySelectorAll(`.${INLINE_BTN_CLASS}[data-swush-kind="${kind}"]`)
    .forEach((node) => node.remove());
}

function setButtonState(
  btn: HTMLButtonElement,
  state: "idle" | "loading" | "ok" | "error",
  text?: string,
) {
  if (state === "loading") {
    btn.disabled = true;
    btn.textContent = "Adding...";
    return;
  }

  btn.disabled = false;

  if (state === "ok") {
    btn.textContent = text || "Added ✓";
    return;
  }

  if (state === "error") {
    btn.textContent = text || "Add failed";
    return;
  }

  btn.textContent = "Add to Swush";
}

function bindUploadAction(
  btn: HTMLButtonElement,
  targetUrl: string,
  defaultTitle: string,
) {
  btn.onclick = () => {
    const title = document.title || defaultTitle;
    setButtonState(btn, "loading");

    chrome.runtime.sendMessage(
      {
        type: "swush:add-remote-upload",
        url: targetUrl,
        title,
      },
      (response) => {
        const runtimeErr = chrome.runtime.lastError;
        if (runtimeErr) {
          setButtonState(btn, "error", "Extension error");
          window.setTimeout(() => setButtonState(btn, "idle"), 1400);
          return;
        }

        if (response?.ok) {
          setButtonState(btn, "ok", "Added ✓");
          window.setTimeout(() => setButtonState(btn, "idle"), 1400);
          return;
        }

        setButtonState(btn, "error", response?.error || "Add failed");
        window.setTimeout(() => setButtonState(btn, "idle"), 1800);
      },
    );
  };
}

function createInlineButton(
  kind: string,
  targetUrl: string,
  titleFallback: string,
) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = INLINE_BTN_CLASS;
  btn.dataset.swushKind = kind;
  btn.dataset.swushTargetUrl = targetUrl;
  btn.textContent = "Add to Swush";
  btn.style.marginLeft = "8px";
  btn.style.padding = "5px 10px";
  btn.style.borderRadius = "9999px";
  btn.style.border = "1px solid rgba(139, 92, 246, .45)";
  btn.style.background = "transparent";
  btn.style.color = "inherit";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "12px";
  btn.style.lineHeight = "1.3";
  btn.style.fontWeight = "600";
  btn.style.position = "relative";
  btn.style.zIndex = "2";
  bindUploadAction(btn, targetUrl, titleFallback);
  return btn;
}

function detectStatusUrlForArticle(article: HTMLElement): string {
  const anchors = article.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/status/"]',
  );
  for (const anchor of anchors) {
    const href = anchor.getAttribute("href") || "";
    if (!href) continue;
    const absolute = toAbsoluteHttpUrl(href);
    if (!absolute) continue;

    try {
      const parsed = new URL(absolute);
      if (isStatusPath(parsed.pathname)) return cleanedUrl(parsed.toString());
    } catch {}
  }

  if (isStatusPath(window.location.pathname))
    return cleanedUrl(window.location.href);
  return "";
}

function getXActionHost(article: HTMLElement): HTMLElement {
  return (
    article.querySelector<HTMLElement>('div[role="group"][id]') ||
    article.querySelector<HTMLElement>('div[role="group"]') ||
    article.querySelector<HTMLElement>('div[data-testid="reply"]')
      ?.parentElement ||
    article
  );
}

function injectInlineButtonsForX() {
  const articles = document.querySelectorAll<HTMLElement>("article");
  articles.forEach((article) => {
    if (
      article.querySelector(`.${INLINE_BTN_CLASS}[data-swush-kind="x-post"]`)
    ) {
      article.setAttribute(INLINE_MARK_ATTR, "1");
      return;
    }

    const statusUrl = detectStatusUrlForArticle(article);
    if (!statusUrl) return;

    const host = getXActionHost(article);
    const btn = createInlineButton("x-post", statusUrl, "Remote status");
    host.appendChild(btn);
    article.setAttribute(INLINE_MARK_ATTR, "1");
  });
}

function detectYouTubeWatchUrl(): string {
  const url = new URL(window.location.href);
  if (!isYouTubeHost(url.hostname)) return "";
  if (!url.pathname.startsWith("/watch")) return "";
  if (!url.searchParams.get("v")) return "";
  return cleanedUrl(url.toString());
}

function injectInlineButtonForYouTubeWatch() {
  const watchUrl = detectYouTubeWatchUrl();
  if (!watchUrl) {
    removeInlineButtonsByKind("youtube-watch");
    return;
  }

  const existing = document.querySelector<HTMLButtonElement>(
    `.${INLINE_BTN_CLASS}[data-swush-kind="youtube-watch"]`,
  );

  if (existing) {
    if (existing.dataset.swushTargetUrl !== watchUrl) {
      existing.remove();
    } else {
      return;
    }
  }

  const host =
    document.querySelector<HTMLElement>("ytd-watch-metadata #owner") ||
    document.querySelector<HTMLElement>("ytd-watch-metadata #actions") ||
    document.querySelector<HTMLElement>("#above-the-fold #title") ||
    document.querySelector<HTMLElement>("#below #meta") ||
    null;

  if (!host) return;

  const wrapper = document.createElement("div");
  wrapper.style.display = "inline-flex";
  wrapper.style.alignItems = "center";
  wrapper.style.marginTop = "8px";
  wrapper.style.marginBottom = "4px";

  const btn = createInlineButton("youtube-watch", watchUrl, "Remote upload");
  btn.style.background = "rgba(17,17,17,.92)";
  btn.style.color = "#f5f5f5";
  btn.style.boxShadow = "0 4px 14px rgba(0,0,0,.28)";

  wrapper.appendChild(btn);
  host.appendChild(wrapper);
}

function collectGenericContainers(): HTMLElement[] {
  const candidates = document.querySelectorAll<HTMLElement>(
    "article, [role='article'], .post, .entry, .feed-item, .timeline-item, .card",
  );
  const unique = new Set<HTMLElement>();

  candidates.forEach((item) => {
    if (!item.isConnected) return;
    if (item.clientHeight < 80) return;
    unique.add(item);
  });

  return Array.from(unique).slice(0, 20);
}

function chooseGenericTargetUrl(container: HTMLElement): string {
  const anchors = container.querySelectorAll<HTMLAnchorElement>("a[href]");
  let bestUrl = "";
  let bestScore = -1;

  anchors.forEach((anchor) => {
    const href = anchor.getAttribute("href") || "";
    const absolute = toAbsoluteHttpUrl(href);
    if (!absolute) return;

    try {
      const parsed = new URL(absolute);
      let score = 0;

      if (parsed.origin === window.location.origin) score += 3;
      if (parsed.pathname.length > 1) score += 1;
      if (/\/(watch|video|videos|post|posts|p|status)\//i.test(parsed.pathname))
        score += 3;
      if (isStatusPath(parsed.pathname)) score += 4;

      if (score > bestScore) {
        bestScore = score;
        bestUrl = cleanedUrl(parsed.toString());
      }
    } catch {}
  });

  if (bestUrl) return bestUrl;

  if (container.querySelector("video")) {
    return cleanedUrl(window.location.href);
  }

  return "";
}

function getGenericActionHost(container: HTMLElement): HTMLElement {
  return (
    container.querySelector<HTMLElement>("footer") ||
    container.querySelector<HTMLElement>("[role='group']") ||
    container.querySelector<HTMLElement>("[class*='actions']") ||
    container.querySelector<HTMLElement>("[class*='footer']") ||
    container
  );
}

function injectInlineButtonsGeneric() {
  const containers = collectGenericContainers();
  containers.forEach((container) => {
    if (
      container.querySelector(
        `.${INLINE_BTN_CLASS}[data-swush-kind="generic-post"]`,
      )
    ) {
      container.setAttribute(INLINE_MARK_ATTR, "1");
      return;
    }

    const targetUrl = chooseGenericTargetUrl(container);
    if (!targetUrl) return;

    const host = getGenericActionHost(container);
    const btn = createInlineButton("generic-post", targetUrl, "Remote upload");
    host.appendChild(btn);
    container.setAttribute(INLINE_MARK_ATTR, "1");
  });
}

async function isEmbeddedButtonEnabled(forceRefresh = false) {
  if (embeddedButtonEnabledCache !== null && !forceRefresh) {
    return embeddedButtonEnabledCache;
  }

  const data = await chrome.storage.sync.get([
    "enableRemoteUploadEmbeddedButton",
  ]);
  embeddedButtonEnabledCache = data.enableRemoteUploadEmbeddedButton === true;
  return embeddedButtonEnabledCache;
}

async function syncInlineButtons() {
  const enabled = await isEmbeddedButtonEnabled();

  if (!enabled) {
    removeLegacyFloating();
    removeInlineButtons();
    lastMode = null;
    return;
  }

  removeLegacyFloating();

  const mode: "x" | "youtube" | "generic" = isXHost(window.location.hostname)
    ? "x"
    : isYouTubeHost(window.location.hostname)
      ? "youtube"
      : "generic";

  if (lastMode !== mode) {
    removeInlineButtons();
    lastMode = mode;
  }

  if (mode === "x") {
    injectInlineButtonsForX();
    return;
  }

  if (mode === "youtube") {
    injectInlineButtonForYouTubeWatch();
    return;
  }

  injectInlineButtonsGeneric();
}

function scheduleSync(delay = 160) {
  if (syncTimer !== null) {
    window.clearTimeout(syncTimer);
    syncTimer = null;
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    if (syncInFlight) return;

    syncInFlight = true;
    void syncInlineButtons().finally(() => {
      syncInFlight = false;
    });
  }, delay);
}

scheduleSync(0);

const observer = new MutationObserver(() => {
  const onYouTube = isYouTubeHost(window.location.hostname);
  scheduleSync(onYouTube ? 360 : 160);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (changes.enableRemoteUploadEmbeddedButton) {
    embeddedButtonEnabledCache =
      changes.enableRemoteUploadEmbeddedButton.newValue === true;
    scheduleSync(0);
  }
});

window.addEventListener("popstate", () => {
  scheduleSync(60);
});

window.addEventListener("hashchange", () => {
  scheduleSync(60);
});
