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

export const SITE_WHITELIST_STORAGE_KEY = "uploadButtonSiteList";

function dedupeAndSort(input: string[]) {
  return Array.from(new Set(input)).sort((a, b) => a.localeCompare(b));
}

export function normalizeDomain(input: string) {
  const value = (input || "").trim().toLowerCase();
  if (!value) return "";

  const noProtocol = value.replace(/^https?:\/\//, "");
  const host = noProtocol
    .split("/")[0]
    .split(":")[0]
    .replace(/^www\./, "");

  if (!host) return "";
  if (host.includes(" ")) return "";
  if (host.startsWith("chrome.") || host.startsWith("about:")) return "";

  return host;
}

export function extractDomainFromUrl(rawUrl?: string | null) {
  const value = (rawUrl || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return normalizeDomain(parsed.hostname);
  } catch {
    return "";
  }
}

export function matchesWhitelistedDomain(hostname: string, domains: string[]) {
  const normalizedHost = normalizeDomain(hostname);
  if (!normalizedHost) return false;

  return domains.some((item) => {
    const normalized = normalizeDomain(item);
    if (!normalized) return false;
    return (
      normalizedHost === normalized || normalizedHost.endsWith(`.${normalized}`)
    );
  });
}

export async function getWhitelistedDomains() {
  const data = await chrome.storage.sync.get([SITE_WHITELIST_STORAGE_KEY]);
  const raw = data[SITE_WHITELIST_STORAGE_KEY];
  const list = Array.isArray(raw)
    ? raw.map((item) => normalizeDomain(String(item))).filter(Boolean)
    : [];
  return dedupeAndSort(list);
}

export async function setWhitelistedDomains(domains: string[]) {
  const cleaned = dedupeAndSort(
    domains.map((item) => normalizeDomain(item)).filter(Boolean),
  );
  await chrome.storage.sync.set({ [SITE_WHITELIST_STORAGE_KEY]: cleaned });
  return cleaned;
}

export async function addWhitelistedDomain(domain: string) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return getWhitelistedDomains();
  const current = await getWhitelistedDomains();
  return setWhitelistedDomains([...current, normalized]);
}

export async function removeWhitelistedDomain(domain: string) {
  const normalized = normalizeDomain(domain);
  const current = await getWhitelistedDomains();
  const next = current.filter((item) => item !== normalized);
  return setWhitelistedDomains(next);
}

export async function toggleWhitelistedDomain(
  domain: string,
  enabled: boolean,
) {
  return enabled
    ? addWhitelistedDomain(domain)
    : removeWhitelistedDomain(domain);
}

export async function isHostWhitelisted(hostname: string) {
  const domains = await getWhitelistedDomains();
  return matchesWhitelistedDomain(hostname, domains);
}
