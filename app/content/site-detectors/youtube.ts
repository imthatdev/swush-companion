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

import { isYouTubeHost } from "./hosts";
import { cleanUrl, detectNearbyMediaUrl } from "./utils";
import type { UploadPlacement } from "./types";

export function detectYouTubePlacements(
  autoDetectMedia: boolean,
): UploadPlacement[] {
  if (!isYouTubeHost(window.location.hostname)) return [];

  const url = new URL(window.location.href);
  const shortsMatch = url.pathname.match(/^\/shorts\/([^/?#]+)/i);

  const isWatch = url.pathname.startsWith("/watch");
  const isShorts = Boolean(shortsMatch?.[1]);
  if (!isWatch && !isShorts) return [];

  const videoId = isWatch ? url.searchParams.get("v") : shortsMatch?.[1] || "";
  if (!videoId) return [];

  const anchor = isWatch
    ? document.querySelector<HTMLElement>(
        "ytd-watch-metadata #top-level-buttons-computed",
      ) ||
      document.querySelector<HTMLElement>(
        "#actions #top-level-buttons-computed",
      ) ||
      document.querySelector<HTMLElement>("#menu #top-level-buttons-computed")
    : document.querySelector<HTMLElement>(
        "ytd-reel-player-overlay-renderer #actions",
      ) ||
      document.querySelector<HTMLElement>("ytd-reel-video-renderer #actions") ||
      document.querySelector<HTMLElement>("ytd-shorts #actions") ||
      null;

  if (!anchor) return [];

  const canonicalWatchOrShortsUrl = isWatch
    ? cleanUrl(url.toString())
    : cleanUrl(`${url.origin}/shorts/${videoId}`);

  const mediaUrl =
    detectNearbyMediaUrl(document, autoDetectMedia) ||
    canonicalWatchOrShortsUrl;

  return [
    {
      id: `youtube:${videoId}`,
      platform: "youtube",
      anchor,
      targetUrl: mediaUrl,
      title: document.title || "YouTube upload",
    },
  ];
}
