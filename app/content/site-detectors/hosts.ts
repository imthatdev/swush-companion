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

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com"];
const X_HOSTS = ["x.com", "www.x.com", "twitter.com", "www.twitter.com"];
const REDDIT_HOSTS = ["reddit.com", "www.reddit.com"];

function hostMatchesAny(hostname: string, hosts: readonly string[]) {
  const host = (hostname || "").toLowerCase();
  return hosts.some((value) => host === value || host.endsWith(`.${value}`));
}

export function isYouTubeHost(hostname: string) {
  return hostMatchesAny(hostname, YOUTUBE_HOSTS);
}

export function isXHost(hostname: string) {
  return hostMatchesAny(hostname, X_HOSTS);
}

export function isRedditHost(hostname: string) {
  return hostMatchesAny(hostname, REDDIT_HOSTS);
}
