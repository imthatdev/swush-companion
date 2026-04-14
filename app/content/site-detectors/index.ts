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

export type {
  PlacementPlatform,
  UploadPlacement,
  DetectorBehaviorOptions,
} from "./types";

export { isYouTubeHost, isXHost, isRedditHost } from "./hosts";

export { cleanUrl, absoluteHttpUrl } from "./utils";
export { extractXStatusUrl } from "./x";

import { detectGenericPlacement } from "./generic";
import { isRedditHost, isYouTubeHost } from "./hosts";
import { detectRedditPlacements } from "./reddit";
import type { DetectorBehaviorOptions, UploadPlacement } from "./types";
import { detectXPlacements } from "./x";
import { detectYouTubePlacements } from "./youtube";

export function detectUploadPlacements(
  options: DetectorBehaviorOptions = {},
): UploadPlacement[] {
  const autoDetectMedia = options.autoDetectMedia !== false;

  const youtube = detectYouTubePlacements(autoDetectMedia);
  if (isYouTubeHost(window.location.hostname)) return youtube;
  if (youtube.length > 0) return youtube;

  const xPlacements = detectXPlacements(autoDetectMedia);
  if (xPlacements.length > 0) return xPlacements;

  const reddit = detectRedditPlacements();
  if (isRedditHost(window.location.hostname)) return reddit;
  if (reddit.length > 0) return reddit;

  return detectGenericPlacement(autoDetectMedia);
}
