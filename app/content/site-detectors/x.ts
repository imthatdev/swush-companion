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

import { isXHost } from "./hosts";
import {
  absoluteHttpUrl,
  cleanUrl,
  detectNearbyMediaUrl,
  findDirectChildWithin,
  findFirstWithin,
} from "./utils";
import type { UploadPlacement } from "./types";

const X_INSERT_AFTER_SELECTORS = [
  '[data-testid="bookmark"]',
  '[data-testid="share"]',
  '[data-testid="like"]',
  '[data-testid="retweet"]',
  '[data-testid="reply"]',
] as const;

export function extractXStatusUrl(article: ParentNode) {
  const statusAnchor = article.querySelector<HTMLAnchorElement>(
    'a[href*="/status/"]',
  );
  const statusUrl = cleanUrl(
    absoluteHttpUrl(statusAnchor?.getAttribute("href") || ""),
  );

  if (!/\/status\//i.test(statusUrl)) return "";
  return statusUrl;
}

export function detectXPlacements(autoDetectMedia: boolean): UploadPlacement[] {
  if (!isXHost(window.location.hostname)) return [];

  const out: UploadPlacement[] = [];
  const articles = Array.from(
    document.querySelectorAll<HTMLElement>("article"),
  ).slice(0, 8);

  for (const article of articles) {
    const anchor =
      article.querySelector<HTMLElement>('div[role="group"]') ||
      article.querySelector<HTMLElement>('div[data-testid="reply"]')
        ?.parentElement ||
      null;

    if (!anchor) continue;

    const statusUrl =
      extractXStatusUrl(article) ||
      (window.location.pathname.includes("/status/")
        ? cleanUrl(window.location.href)
        : "");

    if (!statusUrl || !/\/status\//i.test(statusUrl)) continue;

    const mediaUrl =
      detectNearbyMediaUrl(article, autoDetectMedia) || statusUrl;

    const insertAfterCandidate = findFirstWithin(
      anchor,
      X_INSERT_AFTER_SELECTORS,
    );
    const insertAfter = findDirectChildWithin(anchor, insertAfterCandidate);

    out.push({
      id: `x:${statusUrl}`,
      platform: "x",
      anchor,
      insertAfter: insertAfter || undefined,
      targetUrl: mediaUrl,
      title: document.title || "X upload",
    });
  }

  return out;
}
