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

export function cleanUrl(input: string) {
  try {
    const url = new URL(input);
    url.hash = "";
    return url.toString();
  } catch {
    return input;
  }
}

export function absoluteHttpUrl(raw: string) {
  if (!raw) return "";
  try {
    const maybeAbsolute = raw.startsWith("http")
      ? raw
      : new URL(raw, window.location.origin).toString();
    const parsed = new URL(maybeAbsolute);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function findDirectChildWithin(
  container: HTMLElement,
  node: HTMLElement | null,
) {
  if (!node) return null;

  let current: HTMLElement | null = node;
  while (
    current &&
    current.parentElement &&
    current.parentElement !== container
  ) {
    current = current.parentElement;
  }

  if (!current || current.parentElement !== container) return null;
  return current;
}

export function findFirstWithin(
  root: ParentNode,
  selectors: readonly string[],
) {
  for (const selector of selectors) {
    const match = root.querySelector<HTMLElement>(selector);
    if (match) return match;
  }
  return null;
}

export function hasAnyWithin(root: ParentNode, selectors: readonly string[]) {
  for (const selector of selectors) {
    if (root.querySelector(selector)) return true;
  }
  return false;
}

export function detectNearbyMediaUrl(
  root: ParentNode,
  autoDetectMedia: boolean,
) {
  if (!autoDetectMedia) return "";

  const media =
    root.querySelector<HTMLVideoElement>("video[src]") ||
    root.querySelector<HTMLSourceElement>("video source[src]") ||
    root.querySelector<HTMLImageElement>("img[src]");

  const src = media?.getAttribute("src") || "";
  const absolute = absoluteHttpUrl(src);
  if (absolute) return cleanUrl(absolute);

  const mediaLink = root.querySelector<HTMLAnchorElement>(
    'a[href*=".mp4"], a[href*=".mov"], a[href*=".webm"], a[href*=".jpg"], a[href*=".png"]',
  );

  if (!mediaLink) return "";
  return cleanUrl(absoluteHttpUrl(mediaLink.getAttribute("href") || ""));
}
