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

import { debounce } from "../performance/debounce";
import {
  detectUploadPlacements,
  extractXStatusUrl,
  isRedditHost,
  isXHost,
  isYouTubeHost,
  type UploadPlacement,
} from "../site-detectors";
import { applyAdaptiveButtonStyle } from "./style-adapter";
import {
  getButtonState,
  setButtonState,
  X_DROPDOWN_BUTTON_ATTR,
  X_ICON_ATTR,
  X_LABEL_ATTR,
} from "./button-state";
import { runUploadFlow } from "./upload-flow";
import {
  AUTO_DETECT_MEDIA_KEY,
  FLOATING_FALLBACK_BUTTON_KEY,
  SMART_UI_ADAPTATION_KEY,
} from "../../lib/storage";

const INLINE_BUTTON_ATTR = "data-swush-smart-upload";
const PLACEMENT_ID_ATTR = "data-swush-placement-id";
const FLOATING_BUTTON_ID = "swush-smart-upload-floating";
const X_MORE_TRIGGER_SELECTOR =
  '[data-testid="caret"], button[aria-label*="More" i], [role="button"][aria-label*="More" i]';
const X_FONT_STACK =
  'TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

type XDropdownContext = {
  placementId: string;
  targetUrl: string;
  title: string;
};

type InjectionBehaviorSettings = {
  smartUiAdaptation: boolean;
  floatingFallbackButton: boolean;
  autoDetectMedia: boolean;
};

const DEFAULT_BEHAVIOR_SETTINGS: InjectionBehaviorSettings = {
  smartUiAdaptation: true,
  floatingFallbackButton: true,
  autoDetectMedia: true,
};

let behaviorSettings: InjectionBehaviorSettings = {
  ...DEFAULT_BEHAVIOR_SETTINGS,
};

let latestXDropdownContext: XDropdownContext | null = null;
let latestPlacements: UploadPlacement[] = [];
let lastPlacementSignature = "";

const elementSignatureIds = new WeakMap<Node, number>();
let nextElementSignatureId = 1;

function parseBehaviorSettings(
  data: Record<string, unknown>,
): InjectionBehaviorSettings {
  return {
    smartUiAdaptation: data[SMART_UI_ADAPTATION_KEY] !== false,
    floatingFallbackButton: data[FLOATING_FALLBACK_BUTTON_KEY] !== false,
    autoDetectMedia: data[AUTO_DETECT_MEDIA_KEY] !== false,
  };
}

async function loadBehaviorSettings() {
  try {
    const data = (await chrome.storage.sync.get([
      SMART_UI_ADAPTATION_KEY,
      FLOATING_FALLBACK_BUTTON_KEY,
      AUTO_DETECT_MEDIA_KEY,
    ])) as Record<string, unknown>;

    behaviorSettings = parseBehaviorSettings(data);
  } catch {
    behaviorSettings = { ...DEFAULT_BEHAVIOR_SETTINGS };
  }
}

function applyBehaviorSettingsChanges(
  changes: Record<string, chrome.storage.StorageChange>,
) {
  let changed = false;

  if (changes[SMART_UI_ADAPTATION_KEY]) {
    behaviorSettings.smartUiAdaptation =
      changes[SMART_UI_ADAPTATION_KEY].newValue !== false;
    changed = true;
  }

  if (changes[FLOATING_FALLBACK_BUTTON_KEY]) {
    behaviorSettings.floatingFallbackButton =
      changes[FLOATING_FALLBACK_BUTTON_KEY].newValue !== false;
    changed = true;
  }

  if (changes[AUTO_DETECT_MEDIA_KEY]) {
    behaviorSettings.autoDetectMedia =
      changes[AUTO_DETECT_MEDIA_KEY].newValue !== false;
    changed = true;
  }

  return changed;
}

function allowFloatingFallbackForHost(hostname: string) {
  if (isRedditHost(hostname) || isYouTubeHost(hostname)) {
    return false;
  }
  return true;
}

function getXPlacements() {
  return latestPlacements.filter((placement) => placement.platform === "x");
}

function resolveXDropdownContextFromArticle(
  article: HTMLElement,
  xPlacements: UploadPlacement[],
) {
  const statusUrl = extractXStatusUrl(article);
  if (!statusUrl) return null;

  const placementId = `x:${statusUrl}`;
  const detectedPlacement = xPlacements.find(
    (placement) => placement.id === placementId,
  );
  if (detectedPlacement) {
    return {
      placementId: detectedPlacement.id,
      targetUrl: detectedPlacement.targetUrl,
      title: detectedPlacement.title,
    } satisfies XDropdownContext;
  }

  return {
    placementId,
    targetUrl: statusUrl,
    title: document.title || "X upload",
  } satisfies XDropdownContext;
}

function onPotentialXMoreTriggerClick(event: MouseEvent) {
  if (!isXHost(window.location.hostname)) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const trigger = target.closest<HTMLElement>(X_MORE_TRIGGER_SELECTOR);
  if (!trigger) return;

  const article = trigger.closest<HTMLElement>("article");
  if (!article) return;

  const xPlacements = getXPlacements();
  const context = resolveXDropdownContextFromArticle(article, xPlacements);
  if (context) {
    latestXDropdownContext = context;

    // X mounts menu asynchronously after click.
    window.setTimeout(() => ensureXDropdownButton(getXPlacements()), 0);
    window.setTimeout(() => ensureXDropdownButton(getXPlacements()), 120);
  }
}

function elevateFontWeight(weight: string) {
  const value = (weight || "").trim().toLowerCase();
  if (!value || value === "normal" || value === "400") return "500";
  if (value === "500") return "600";
  if (value === "600") return "700";
  if (value === "bold") return "bold";

  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) return "600";
  return String(Math.min(numeric + 100, 700));
}

function applyXDropdownButtonStyle(
  button: HTMLButtonElement,
  dropdown: HTMLElement,
  smartUiAdaptation: boolean,
) {
  const sampleItem = smartUiAdaptation
    ? dropdown.querySelector<HTMLElement>('[role="menuitem"]') ||
      dropdown.querySelector<HTMLElement>("button") ||
      null
    : null;

  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.gap = "14px";
  button.style.width = "100%";
  button.style.border = "none";
  button.style.background = "transparent";
  button.style.cursor = "pointer";
  button.style.textAlign = "left";
  button.style.padding = "12px 16px";
  button.style.margin = "0";
  button.style.color = "inherit";
  button.style.fontFamily = X_FONT_STACK;
  button.style.fontWeight = "600";

  if (sampleItem) {
    const style = window.getComputedStyle(sampleItem);
    button.style.fontFamily = style.fontFamily || X_FONT_STACK;
    button.style.fontSize = style.fontSize;
    button.style.fontWeight = elevateFontWeight(style.fontWeight);
    button.style.lineHeight = style.lineHeight;
    button.style.color = style.color;
    if (style.padding && style.padding !== "0px") {
      button.style.padding = style.padding;
    }
    if (style.minHeight && style.minHeight !== "0px") {
      button.style.minHeight = style.minHeight;
    }
  }

  const icon = button.querySelector<HTMLImageElement>(
    `img[${X_ICON_ATTR}="1"]`,
  );
  if (icon) {
    icon.style.width = "16px";
    icon.style.height = "16px";
    icon.style.borderRadius = "3px";
  }

  const label = button.querySelector<HTMLSpanElement>(
    `span[${X_LABEL_ATTR}="1"]`,
  );
  if (label) {
    label.style.display = "inline";
    label.style.pointerEvents = "none";
    label.style.fontFamily = button.style.fontFamily || X_FONT_STACK;
    label.style.fontSize = button.style.fontSize || "15px";
    label.style.fontWeight = button.style.fontWeight || "600";
  }
}

function resolveXDropdownContext(placements: UploadPlacement[]) {
  const xPlacements = placements.filter(
    (placement) => placement.platform === "x",
  );

  if (latestXDropdownContext) {
    const match = xPlacements.find(
      (placement) => placement.id === latestXDropdownContext?.placementId,
    );
    if (match) {
      return {
        placementId: match.id,
        targetUrl: match.targetUrl,
        title: match.title,
      } satisfies XDropdownContext;
    }

    if (xPlacements.length === 1) {
      return {
        placementId: xPlacements[0].id,
        targetUrl: xPlacements[0].targetUrl,
        title: xPlacements[0].title,
      } satisfies XDropdownContext;
    }

    return latestXDropdownContext;
  }

  if (xPlacements.length === 1) {
    return {
      placementId: xPlacements[0].id,
      targetUrl: xPlacements[0].targetUrl,
      title: xPlacements[0].title,
    } satisfies XDropdownContext;
  }

  return null;
}

function removeAllXDropdownButtons() {
  document
    .querySelectorAll<HTMLButtonElement>(
      `button[${X_DROPDOWN_BUTTON_ATTR}="1"]`,
    )
    .forEach((button) => button.remove());
}

function ensureXDropdownButton(placements: UploadPlacement[]) {
  document
    .querySelectorAll<HTMLButtonElement>(
      `button[${X_DROPDOWN_BUTTON_ATTR}="1"]`,
    )
    .forEach((button) => {
      if (!button.closest('[data-testid="Dropdown"]')) {
        button.remove();
      }
    });

  if (!isXHost(window.location.hostname)) return;

  const dropdowns = Array.from(
    document.querySelectorAll<HTMLElement>('[data-testid="Dropdown"]'),
  );
  if (dropdowns.length === 0) return;

  const context = resolveXDropdownContext(placements);
  if (!context) {
    removeAllXDropdownButtons();
    return;
  }

  dropdowns.forEach((dropdown) => {
    const menuContainer =
      dropdown.querySelector<HTMLElement>('[role="menu"]') || dropdown;

    let button = menuContainer.querySelector<HTMLButtonElement>(
      `button[${X_DROPDOWN_BUTTON_ATTR}="1"]`,
    );

    if (!button) {
      const createdButton = document.createElement("button");
      createdButton.type = "button";
      createdButton.setAttribute(X_DROPDOWN_BUTTON_ATTR, "1");
      createdButton.setAttribute("role", "menuitem");
      createdButton.dataset.platform = "x";

      createdButton.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const targetUrl = createdButton.dataset.targetUrl || context.targetUrl;
        const title = createdButton.dataset.title || context.title;
        await runUploadFlow(createdButton, targetUrl, title);
      };

      const firstItem =
        menuContainer.querySelector<HTMLElement>('[role="menuitem"]');
      if (firstItem && firstItem.parentElement === menuContainer) {
        menuContainer.insertBefore(createdButton, firstItem.nextSibling);
      } else {
        menuContainer.appendChild(createdButton);
      }

      button = createdButton;
    }

    button.dataset.targetUrl = context.targetUrl;
    button.dataset.title = context.title;
    setButtonState(button, getButtonState(button));
    applyXDropdownButtonStyle(
      button,
      dropdown,
      behaviorSettings.smartUiAdaptation,
    );
  });
}

function attachButtonBehavior(
  button: HTMLButtonElement,
  placement: UploadPlacement,
) {
  button.onclick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const targetUrl = button.dataset.targetUrl || placement.targetUrl;
    const title = button.dataset.title || placement.title;
    await runUploadFlow(button, targetUrl, title);
  };
}

function mountInlineButton(
  button: HTMLButtonElement,
  placement: UploadPlacement,
) {
  const { insertAfter, anchor } = placement;
  if (insertAfter?.parentElement) {
    const parent = insertAfter.parentElement;
    if (button.parentElement !== parent || insertAfter.nextSibling !== button) {
      parent.insertBefore(button, insertAfter.nextSibling);
    }
    return;
  }

  if (button.parentElement !== anchor) {
    anchor.appendChild(button);
    return;
  }

  if (anchor.lastElementChild !== button) {
    anchor.appendChild(button);
  }
}

function createInlineButton(placement: UploadPlacement) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(INLINE_BUTTON_ATTR, "1");
  button.setAttribute(PLACEMENT_ID_ATTR, placement.id);
  button.dataset.platform = placement.platform;
  setButtonState(button, "idle");
  applyAdaptiveButtonStyle(button, placement.anchor, placement.platform, {
    smartUiAdaptation: behaviorSettings.smartUiAdaptation,
  });
  attachButtonBehavior(button, placement);
  return button;
}

function ensureInlineButton(placement: UploadPlacement) {
  const existing = document.querySelector<HTMLButtonElement>(
    `button[${INLINE_BUTTON_ATTR}="1"][${PLACEMENT_ID_ATTR}="${CSS.escape(placement.id)}"]`,
  );

  if (existing) {
    existing.dataset.platform = placement.platform;
    existing.dataset.targetUrl = placement.targetUrl;
    existing.dataset.title = placement.title;
    setButtonState(existing, getButtonState(existing));
    applyAdaptiveButtonStyle(existing, placement.anchor, placement.platform, {
      smartUiAdaptation: behaviorSettings.smartUiAdaptation,
    });
    attachButtonBehavior(existing, placement);
    mountInlineButton(existing, placement);
    return;
  }

  const button = createInlineButton(placement);
  button.dataset.targetUrl = placement.targetUrl;
  button.dataset.title = placement.title;
  mountInlineButton(button, placement);
}

function removeStaleInlineButtons(activePlacementIds: Set<string>) {
  document
    .querySelectorAll<HTMLButtonElement>(`button[${INLINE_BUTTON_ATTR}="1"]`)
    .forEach((button) => {
      const id = button.getAttribute(PLACEMENT_ID_ATTR) || "";
      if (!activePlacementIds.has(id)) {
        button.remove();
      }
    });
}

function ensureFloatingFallback(url: string, title: string) {
  const existing = document.getElementById(
    FLOATING_BUTTON_ID,
  ) as HTMLButtonElement | null;
  if (existing) {
    existing.dataset.targetUrl = url;
    existing.dataset.title = title;
    return;
  }

  const button = document.createElement("button");
  button.id = FLOATING_BUTTON_ID;
  button.type = "button";
  button.dataset.platform = "generic";
  setButtonState(button, "idle");
  button.style.position = "fixed";
  button.style.right = "16px";
  button.style.bottom = "16px";
  button.style.zIndex = "2147483640";
  button.style.padding = "10px 14px";
  button.style.borderRadius = "999px";
  button.style.border = "1px solid rgba(124, 58, 237, 0.45)";
  button.style.background = "rgba(17, 24, 39, 0.92)";
  button.style.color = "#f9fafb";
  button.style.font = "600 12px/1.2 Inter, system-ui, sans-serif";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 10px 30px rgba(0,0,0,.28)";
  button.dataset.targetUrl = url;
  button.dataset.title = title;

  button.onclick = async () => {
    const targetUrl = button.dataset.targetUrl || url;
    const targetTitle = button.dataset.title || title;
    await runUploadFlow(button, targetUrl, targetTitle);
  };

  document.body.appendChild(button);
}

function removeFloatingFallback() {
  const node = document.getElementById(FLOATING_BUTTON_ID);
  if (node) node.remove();
}

function getElementSignatureId(element: Element | null | undefined) {
  if (!element) return "none";

  const existing = elementSignatureIds.get(element);
  if (existing) return String(existing);

  const created = nextElementSignatureId++;
  elementSignatureIds.set(element, created);
  return String(created);
}

function buildPlacementSignature(placements: UploadPlacement[]) {
  if (placements.length === 0) {
    return `empty:${window.location.href}:${document.title}`;
  }

  const lines = placements.map((placement) => {
    return [
      placement.id,
      placement.platform,
      placement.targetUrl,
      getElementSignatureId(placement.anchor),
      getElementSignatureId(placement.insertAfter),
    ].join("|");
  });

  lines.sort();
  return lines.join("||");
}

function syncPlacements() {
  const placements = detectUploadPlacements({
    autoDetectMedia: behaviorSettings.autoDetectMedia,
  });
  latestPlacements = placements;

  const signature = buildPlacementSignature(placements);
  const unchanged = signature === lastPlacementSignature;
  if (!unchanged) {
    lastPlacementSignature = signature;
  }

  ensureXDropdownButton(placements);

  if (placements.length === 0) {
    removeStaleInlineButtons(new Set());
    const showFloatingFallback =
      behaviorSettings.floatingFallbackButton &&
      allowFloatingFallbackForHost(window.location.hostname);

    if (!showFloatingFallback) {
      removeFloatingFallback();
      return;
    }

    ensureFloatingFallback(window.location.href, document.title || "Upload");
    return;
  }

  removeFloatingFallback();

  if (unchanged) {
    return;
  }

  const inlinePlacements = placements.filter(
    (placement) => placement.platform !== "x",
  );

  const activeIds = new Set<string>();
  inlinePlacements.forEach((placement) => {
    activeIds.add(placement.id);
    ensureInlineButton(placement);
  });

  removeStaleInlineButtons(activeIds);
}

export function startContextualUploadInjection() {
  const scheduleSync = debounce(syncPlacements, 140);
  let lastHref = window.location.href;

  const onStorageChange: Parameters<
    typeof chrome.storage.onChanged.addListener
  >[0] = (changes, area) => {
    if (area !== "sync") return;
    if (!applyBehaviorSettingsChanges(changes)) return;

    lastPlacementSignature = "";
    scheduleSync();
  };

  document.addEventListener("click", onPotentialXMoreTriggerClick, true);
  chrome.storage.onChanged.addListener(onStorageChange);
  scheduleSync();

  void loadBehaviorSettings().then(() => {
    lastPlacementSignature = "";
    scheduleSync();
  });

  const observer = new MutationObserver(() => {
    scheduleSync();
  });

  const observerTarget = document.body || document.documentElement;
  observer.observe(observerTarget, {
    childList: true,
    subtree: true,
  });

  const onPopState = () => {
    lastPlacementSignature = "";
    scheduleSync();
  };

  const onHashChange = () => {
    lastPlacementSignature = "";
    scheduleSync();
  };

  const hrefWatch = window.setInterval(() => {
    if (window.location.href === lastHref) return;
    lastHref = window.location.href;
    latestXDropdownContext = null;
    lastPlacementSignature = "";
    scheduleSync();
  }, 1000);

  window.addEventListener("popstate", onPopState);
  window.addEventListener("hashchange", onHashChange);

  return () => {
    document.removeEventListener("click", onPotentialXMoreTriggerClick, true);
    chrome.storage.onChanged.removeListener(onStorageChange);
    observer.disconnect();
    window.clearInterval(hrefWatch);
    window.removeEventListener("popstate", onPopState);
    window.removeEventListener("hashchange", onHashChange);
    removeFloatingFallback();
    removeStaleInlineButtons(new Set());
    removeAllXDropdownButtons();
    latestPlacements = [];
    latestXDropdownContext = null;
    lastPlacementSignature = "";
  };
}
