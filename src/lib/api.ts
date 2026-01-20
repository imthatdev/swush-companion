/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical.
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   You may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at

 *   http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { getSettings } from "./storage";

const DEFAULT_ENDPOINTS = {
  bookmarks: "/api/v1/bookmarks",
  notes: "/api/v1/notes",
  files: "/api/v1/upload",
  shorten: "/api/v1/shorten",
  deviceAuthorize: "/api/v1/auth/device/authorize",
  deviceToken: "/api/v1/auth/device/token",
};

function join(base: string, seg: string) {
  return `${base}${seg.startsWith("/") ? seg : `/${seg}`}`;
}

function normalizeUrl(u: string): string | null {
  try {
    const input = u.trim();
    if (!input) return null;
    const hasProtocol = /^https?:\/\//i.test(input);
    const fixed = hasProtocol ? input : `https://${input}`;
    return new URL(fixed).toString();
  } catch {
    return null;
  }
}

function deriveTitle(text: string): string {
  const single = text.replace(/\s+/g, " ").trim();
  if (!single) return "Note";
  const sentenceEnd = single.search(/[.!?]\s/);
  const candidate =
    sentenceEnd > 0 ? single.slice(0, sentenceEnd) : single.slice(0, 80);
  return candidate.length > 80 ? candidate.slice(0, 77) + "…" : candidate;
}

async function authHeaders() {
  const { apiKey } = await getSettings();
  if (!apiKey) throw new Error("Missing API key (connect in Options).");
  return { "x-api-key": apiKey };
}

async function getBaseUrl() {
  const { baseUrl } = await getSettings();
  if (!baseUrl) throw new Error("Missing Base URL (set it in Options).");
  return baseUrl;
}

async function requestJson<T>(input: RequestInfo, init: RequestInit) {
  const response = await fetch(input, init);
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message =
      payload?.error_description ||
      payload?.error ||
      payload?.message ||
      `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export async function addBookmark(url: string, title?: string) {
  const baseUrl = await getBaseUrl();
  return requestJson(join(baseUrl, DEFAULT_ENDPOINTS.bookmarks), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ url, title, isFavorite: false }),
  });
}

export async function addNote(
  content: string,
  sourceUrl?: string | null,
  title?: string | null,
) {
  const safeContent = (content ?? "").toString();
  const finalTitle = (title ?? deriveTitle(safeContent)).trim() || "Note";

  const baseUrl = await getBaseUrl();
  return requestJson(join(baseUrl, DEFAULT_ENDPOINTS.notes), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      title: finalTitle,
      content: safeContent,
      sourceUrl: sourceUrl ?? null,
    }),
  });
}

export async function shortenLink(rawUrl: string) {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) throw new Error("Invalid URL");

  const baseUrl = await getBaseUrl();
  return requestJson(join(baseUrl, DEFAULT_ENDPOINTS.shorten), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      originalUrl: normalized,
      url: normalized,
      isPublic: true,
    }),
  });
}

export async function uploadFileBlob(
  file: File | Blob,
  name?: string,
  isPublic = true,
) {
  const fd = new FormData();
  fd.append(
    "file",
    file instanceof File ? file : new File([file], name || "upload.bin"),
  );
  fd.append("isPublic", String(isPublic));
  if (name) fd.append("name", name);

  const baseUrl = await getBaseUrl();
  return requestJson(join(baseUrl, DEFAULT_ENDPOINTS.files), {
    method: "POST",
    headers: { ...(await authHeaders()) },
    body: fd,
  });
}

export async function startDeviceFlow(baseUrl: string, extensionId: string) {
  return requestJson<{
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    expires_in: number;
    interval: number;
  }>(join(baseUrl, DEFAULT_ENDPOINTS.deviceAuthorize), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extension_id: extensionId }),
  });
}

export async function pollDeviceToken(baseUrl: string, deviceCode: string) {
  const response = await fetch(join(baseUrl, DEFAULT_ENDPOINTS.deviceToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_code: deviceCode }),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      error: payload?.error || "request_failed",
      error_description:
        payload?.error_description || payload?.message || "Request failed",
      interval: payload?.interval,
    } as const;
  }

  return {
    ok: true,
    data: payload as {
      token_type: string;
      api_key: string;
      expires_in: number;
      interval?: number;
    },
  } as const;
}
