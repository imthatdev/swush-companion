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

import type { PlacementPlatform } from "../site-detectors";

export type AdaptiveStyleOptions = {
  smartUiAdaptation?: boolean;
};

function findStyleSample(anchor: HTMLElement) {
  return (
    anchor.querySelector<HTMLElement>(
      "button, a[role='button'], [role='button'], a",
    ) ||
    anchor.closest<HTMLElement>(
      "button, a[role='button'], [role='button'], a",
    ) ||
    null
  );
}

function hasVisibleBackground(color: string) {
  const normalized = (color || "").toLowerCase();
  return normalized !== "transparent" && normalized !== "rgba(0, 0, 0, 0)";
}

function applyXButtonStyle(
  button: HTMLButtonElement,
  sample: CSSStyleDeclaration,
) {
  button.style.fontFamily = sample.fontFamily;
  button.style.fontSize = "11px";
  button.style.fontWeight = sample.fontWeight || "600";
  button.style.letterSpacing = sample.letterSpacing;
  button.style.color = sample.color || "rgb(113, 118, 123)";
  button.style.background = "transparent";
  button.style.border = "none";
  button.style.borderRadius = "999px";
  button.style.padding = "8px";
  button.style.marginLeft = "4px";
  button.style.lineHeight = "1";
  button.style.boxShadow = "none";
  button.style.gap = "4px";
  button.style.minWidth = "34px";
  button.style.height = "34px";
  button.style.justifyContent = "center";

  const icon = button.querySelector<HTMLImageElement>(
    'img[data-swush-x-icon="1"]',
  );
  if (icon) {
    icon.style.width = "16px";
    icon.style.height = "16px";
    icon.style.display = "block";
    icon.style.borderRadius = "4px";
  }

  const label = button.querySelector<HTMLElement>(
    'span[data-swush-x-label="1"]',
  );
  if (label) {
    label.style.fontSize = "10px";
    label.style.fontWeight = "600";
    label.style.lineHeight = "1";
    label.style.color = sample.color || "rgb(113, 118, 123)";
    label.style.pointerEvents = "none";
  }
}

function applyRedditButtonStyle(
  button: HTMLButtonElement,
  sample: CSSStyleDeclaration,
) {
  button.style.setProperty("display", "inline-flex", "important");
  button.style.setProperty("align-items", "center", "important");
  button.style.fontFamily = sample.fontFamily;
  button.style.fontSize = sample.fontSize || "14px";
  button.style.fontWeight = sample.fontWeight || "600";
  button.style.letterSpacing = sample.letterSpacing;
  button.style.color = sample.color;
  button.style.background = hasVisibleBackground(sample.backgroundColor)
    ? sample.backgroundColor
    : "rgba(128, 128, 128, 0.12)";
  button.style.border =
    sample.border && sample.border !== "0px none rgb(0, 0, 0)"
      ? sample.border
      : "1px solid transparent";
  button.style.borderRadius = sample.borderRadius || "999px";
  button.style.padding =
    sample.padding && sample.padding !== "0px" ? sample.padding : "6px 10px";
  button.style.setProperty("margin", "0 0 0 6px", "important");
  button.style.lineHeight = sample.lineHeight || "1.1";
  button.style.setProperty("align-self", "center", "important");
  button.style.setProperty("vertical-align", "middle", "important");
  button.style.transform = "none";
  button.style.boxShadow =
    sample.boxShadow && sample.boxShadow !== "none" ? sample.boxShadow : "none";

  const icon = button.querySelector<HTMLImageElement>(
    'img[data-swush-reddit-icon="1"]',
  );
  if (icon) {
    icon.style.setProperty("width", "19px", "important");
    icon.style.setProperty("height", "19px", "important");
    icon.style.setProperty("max-width", "none", "important");
    icon.style.setProperty("max-height", "none", "important");
    icon.style.setProperty("display", "block", "important");
    icon.style.setProperty("transform", "none", "important");
    icon.style.setProperty("margin-top", "1px", "important");
    icon.style.setProperty("margin-bottom", "0", "important");
    icon.style.borderRadius = "4px";
    icon.style.pointerEvents = "none";
    icon.style.flexShrink = "0";
    icon.style.opacity = "1";
    icon.style.alignSelf = "center";
    icon.style.objectFit = "contain";
  }

  const label = button.querySelector<HTMLElement>(
    'span[data-swush-reddit-label="1"]',
  );
  if (label) {
    label.style.setProperty("display", "inline-flex", "important");
    label.style.setProperty("align-items", "center", "important");
    label.style.pointerEvents = "none";
    label.style.lineHeight = sample.lineHeight || "1.1";
  }
}

function applyYouTubeButtonStyle(
  button: HTMLButtonElement,
  sample: CSSStyleDeclaration,
) {
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.boxSizing = "border-box";
  button.style.alignSelf = "center";
  button.style.fontFamily = sample.fontFamily;
  button.style.fontSize = "14px";
  button.style.fontWeight = sample.fontWeight || "500";
  button.style.letterSpacing = sample.letterSpacing;
  button.style.color = sample.color || "inherit";
  button.style.background = hasVisibleBackground(sample.backgroundColor)
    ? sample.backgroundColor
    : "rgba(128, 128, 128, 0.14)";
  button.style.border =
    sample.border && sample.border !== "0px none rgb(0, 0, 0)"
      ? sample.border
      : "1px solid transparent";
  button.style.borderRadius = "9999px";
  button.style.padding = "2px 14px";
  button.style.marginLeft = "8px";
  button.style.lineHeight = "1";
  button.style.height = "36px";
  button.style.minHeight = "36px";
  button.style.gap = "8px";
  button.style.boxShadow =
    sample.boxShadow && sample.boxShadow !== "none" ? sample.boxShadow : "none";

  const icon = button.querySelector<HTMLImageElement>(
    'img[data-swush-youtube-icon="1"]',
  );
  if (icon) {
    icon.style.width = "16px";
    icon.style.height = "16px";
    icon.style.display = "block";
    icon.style.borderRadius = "4px";
    icon.style.pointerEvents = "none";
    icon.style.flexShrink = "0";
    icon.style.objectFit = "contain";
  }

  const label = button.querySelector<HTMLElement>(
    'span[data-swush-youtube-label="1"]',
  );
  if (label) {
    label.style.display = "inline-flex";
    label.style.alignItems = "center";
    label.style.pointerEvents = "none";
    label.style.lineHeight = "1";
  }
}

export function applyAdaptiveButtonStyle(
  button: HTMLButtonElement,
  anchor: HTMLElement,
  platform: PlacementPlatform,
  options: AdaptiveStyleOptions = {},
) {
  const sample =
    options.smartUiAdaptation === false ? null : findStyleSample(anchor);

  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.gap = "6px";
  button.style.marginLeft = "8px";
  button.style.padding = "6px 12px";
  button.style.fontSize = "12px";
  button.style.fontWeight = "600";
  button.style.lineHeight = "1.2";
  button.style.cursor = "pointer";
  button.style.whiteSpace = "nowrap";
  button.style.transition = "transform 120ms ease, opacity 120ms ease";
  button.style.zIndex = "2";
  button.style.maxWidth = "100%";

  if (!sample) {
    if (platform === "x" || platform === "reddit" || platform === "youtube") {
      button.style.border =
        platform === "reddit" || platform === "youtube"
          ? "1px solid rgba(148, 163, 184, 0.28)"
          : "none";
      button.style.borderRadius = "999px";
      button.style.background =
        platform === "reddit" || platform === "youtube"
          ? "rgba(148, 163, 184, 0.14)"
          : "transparent";
      button.style.color = "inherit";
      button.style.padding =
        platform === "reddit"
          ? "6px 10px"
          : platform === "youtube"
            ? "2px 14px"
            : "8px";
      if (platform === "youtube") {
        button.style.height = "36px";
        button.style.minHeight = "36px";
        button.style.lineHeight = "1";
        button.style.alignSelf = "center";
        button.style.gap = "8px";

        const icon = button.querySelector<HTMLImageElement>(
          'img[data-swush-youtube-icon="1"]',
        );
        if (icon) {
          icon.style.width = "16px";
          icon.style.height = "16px";
          icon.style.display = "block";
          icon.style.borderRadius = "4px";
          icon.style.pointerEvents = "none";
          icon.style.flexShrink = "0";
          icon.style.objectFit = "contain";
        }

        const label = button.querySelector<HTMLElement>(
          'span[data-swush-youtube-label="1"]',
        );
        if (label) {
          label.style.display = "inline-flex";
          label.style.alignItems = "center";
          label.style.pointerEvents = "none";
          label.style.lineHeight = "1";
        }
      }
      return;
    }

    button.style.border = "1px solid rgba(124, 58, 237, 0.45)";
    button.style.borderRadius = "999px";
    button.style.background = "rgba(124, 58, 237, 0.1)";
    button.style.color = "inherit";
    return;
  }

  const style = window.getComputedStyle(sample);

  if (platform === "x") {
    applyXButtonStyle(button, style);
    return;
  }

  if (platform === "reddit") {
    applyRedditButtonStyle(button, style);
    return;
  }

  if (platform === "youtube") {
    applyYouTubeButtonStyle(button, style);
    return;
  }

  button.style.fontFamily = style.fontFamily;
  button.style.fontSize = style.fontSize;
  button.style.fontWeight = style.fontWeight;
  button.style.letterSpacing = style.letterSpacing;
  button.style.borderRadius = style.borderRadius || "999px";
  button.style.border = style.border;
  button.style.color = style.color;
  button.style.background = hasVisibleBackground(style.backgroundColor)
    ? style.backgroundColor
    : "rgba(124, 58, 237, 0.16)";

  if (!button.style.border || button.style.border === "0px none rgb(0, 0, 0)") {
    button.style.border = "1px solid rgba(124, 58, 237, 0.45)";
  }

  button.style.boxShadow =
    style.boxShadow && style.boxShadow !== "none" ? style.boxShadow : "none";
}
