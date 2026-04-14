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

import type { UploadPlacement } from "../site-detectors";

export const BUTTON_STATE_ATTR = "data-swush-state";
export const X_ICON_ATTR = "data-swush-x-icon";
export const X_LABEL_ATTR = "data-swush-x-label";
export const REDDIT_ICON_ATTR = "data-swush-reddit-icon";
export const REDDIT_LABEL_ATTR = "data-swush-reddit-label";
export const YOUTUBE_ICON_ATTR = "data-swush-youtube-icon";
export const YOUTUBE_LABEL_ATTR = "data-swush-youtube-label";
export const X_DROPDOWN_BUTTON_ATTR = "data-swush-x-dropdown-upload";

const SWUSH_ICON_EXTENSION_URL = chrome.runtime.getURL("icons/logo.png");
const SWUSH_ICON_DATA_URL =
  "data:image/png;base64,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";

export type ButtonState = "idle" | "loading" | "ok" | "queued" | "error";

const DEFAULT_LABELS: Record<ButtonState, string> = {
  idle: "Swush",
  loading: "Sending...",
  ok: "Uploaded",
  queued: "Queued offline",
  error: "Try again",
};

const REDDIT_LABELS: Record<ButtonState, string> = {
  idle: "Swush",
  loading: "Sending...",
  ok: "Saved",
  queued: "Queued",
  error: "Retry",
};

const X_LABELS: Record<ButtonState, string> = {
  idle: "",
  loading: "...",
  ok: "",
  queued: "",
  error: "!",
};

const X_DROPDOWN_LABELS: Record<ButtonState, string> = {
  idle: "Upload to Swush",
  loading: "Sending...",
  ok: "Uploaded",
  queued: "Queued",
  error: "Try again",
};

function getPlatform(button: HTMLButtonElement): UploadPlacement["platform"] {
  const platform = button.dataset.platform;
  if (
    platform === "youtube" ||
    platform === "reddit" ||
    platform === "x" ||
    platform === "generic"
  ) {
    return platform;
  }
  return "generic";
}

function labelsFor(button: HTMLButtonElement) {
  const platform = getPlatform(button);
  if (button.getAttribute(X_DROPDOWN_BUTTON_ATTR) === "1") {
    return X_DROPDOWN_LABELS;
  }

  if (platform === "x") {
    return X_LABELS;
  }
  if (platform === "reddit") {
    return REDDIT_LABELS;
  }
  return DEFAULT_LABELS;
}

function ensureXButtonStructure(button: HTMLButtonElement) {
  let icon = button.querySelector<HTMLImageElement>(`img[${X_ICON_ATTR}="1"]`);
  if (!icon) {
    icon = document.createElement("img");
    icon.setAttribute(X_ICON_ATTR, "1");
    icon.alt = "";
    icon.width = 16;
    icon.height = 16;
    button.prepend(icon);
  }

  icon.src = SWUSH_ICON_EXTENSION_URL || SWUSH_ICON_DATA_URL;
  icon.decoding = "async";
  icon.style.display = "block";
  icon.style.pointerEvents = "none";

  let label = button.querySelector<HTMLSpanElement>(
    `span[${X_LABEL_ATTR}="1"]`,
  );
  if (!label) {
    label = document.createElement("span");
    label.setAttribute(X_LABEL_ATTR, "1");
    button.appendChild(label);
  }
}

function removeXButtonStructure(button: HTMLButtonElement) {
  const icon = button.querySelector(`img[${X_ICON_ATTR}="1"]`);
  if (icon) icon.remove();

  const label = button.querySelector(`span[${X_LABEL_ATTR}="1"]`);
  if (label) label.remove();
}

function ensureYouTubeButtonStructure(button: HTMLButtonElement) {
  let icon = button.querySelector<HTMLImageElement>(
    `img[${YOUTUBE_ICON_ATTR}="1"]`,
  );
  if (!icon) {
    icon = document.createElement("img");
    icon.setAttribute(YOUTUBE_ICON_ATTR, "1");
    icon.alt = "";
    icon.width = 16;
    icon.height = 16;
    button.prepend(icon);
  }

  icon.src = SWUSH_ICON_EXTENSION_URL || SWUSH_ICON_DATA_URL;
  icon.decoding = "async";
  icon.style.display = "block";
  icon.style.pointerEvents = "none";

  let label = button.querySelector<HTMLSpanElement>(
    `span[${YOUTUBE_LABEL_ATTR}="1"]`,
  );
  if (!label) {
    label = document.createElement("span");
    label.setAttribute(YOUTUBE_LABEL_ATTR, "1");
    button.appendChild(label);
  }
}

function removeYouTubeButtonStructure(button: HTMLButtonElement) {
  const icon = button.querySelector(`img[${YOUTUBE_ICON_ATTR}="1"]`);
  if (icon) icon.remove();

  const label = button.querySelector(`span[${YOUTUBE_LABEL_ATTR}="1"]`);
  if (label) label.remove();
}

function ensureRedditButtonStructure(button: HTMLButtonElement) {
  let icon = button.querySelector<HTMLImageElement>(
    `img[${REDDIT_ICON_ATTR}="1"]`,
  );
  if (!icon) {
    icon = document.createElement("img");
    icon.setAttribute(REDDIT_ICON_ATTR, "1");
    icon.alt = "";
    icon.width = 20;
    icon.height = 20;
    button.prepend(icon);
  }

  icon.src = SWUSH_ICON_EXTENSION_URL || SWUSH_ICON_DATA_URL;
  icon.decoding = "async";
  icon.style.display = "block";
  icon.style.pointerEvents = "none";

  let label = button.querySelector<HTMLSpanElement>(
    `span[${REDDIT_LABEL_ATTR}="1"]`,
  );
  if (!label) {
    label = document.createElement("span");
    label.setAttribute(REDDIT_LABEL_ATTR, "1");
    button.appendChild(label);
  }
}

function removeRedditButtonStructure(button: HTMLButtonElement) {
  const icon = button.querySelector(`img[${REDDIT_ICON_ATTR}="1"]`);
  if (icon) icon.remove();

  const label = button.querySelector(`span[${REDDIT_LABEL_ATTR}="1"]`);
  if (label) label.remove();
}

function syncPlatformStructure(button: HTMLButtonElement) {
  const platform = getPlatform(button);

  if (platform === "x") {
    ensureXButtonStructure(button);
    removeRedditButtonStructure(button);
    removeYouTubeButtonStructure(button);
    return;
  }

  if (platform === "youtube") {
    ensureYouTubeButtonStructure(button);
    removeXButtonStructure(button);
    removeRedditButtonStructure(button);
    return;
  }

  if (platform === "reddit") {
    ensureRedditButtonStructure(button);
    removeXButtonStructure(button);
    removeYouTubeButtonStructure(button);
    return;
  }

  removeXButtonStructure(button);
  removeRedditButtonStructure(button);
  removeYouTubeButtonStructure(button);
}

export function getButtonState(button: HTMLButtonElement): ButtonState {
  const state = button.getAttribute(BUTTON_STATE_ATTR);
  if (
    state === "idle" ||
    state === "loading" ||
    state === "ok" ||
    state === "queued" ||
    state === "error"
  ) {
    return state;
  }
  return "idle";
}

export function setButtonState(button: HTMLButtonElement, state: ButtonState) {
  button.setAttribute(BUTTON_STATE_ATTR, state);
  syncPlatformStructure(button);

  const labels = labelsFor(button);
  button.disabled = state === "loading";
  const label = labels[state];

  const xLabel = button.querySelector<HTMLSpanElement>(
    `span[${X_LABEL_ATTR}="1"]`,
  );
  const redditLabel = button.querySelector<HTMLSpanElement>(
    `span[${REDDIT_LABEL_ATTR}="1"]`,
  );
  const youtubeLabel = button.querySelector<HTMLSpanElement>(
    `span[${YOUTUBE_LABEL_ATTR}="1"]`,
  );

  if (xLabel) {
    xLabel.textContent = label;
    xLabel.style.display = label ? "inline" : "none";
  } else if (redditLabel) {
    redditLabel.textContent = label;
    redditLabel.style.display = label ? "inline" : "none";
  } else if (youtubeLabel) {
    youtubeLabel.textContent = label;
    youtubeLabel.style.display = label ? "inline" : "none";
  } else {
    button.textContent = label;
  }

  button.setAttribute("aria-label", DEFAULT_LABELS[state]);
  button.title = DEFAULT_LABELS[state];
}
