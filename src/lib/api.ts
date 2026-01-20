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

async function auth() {
  const { token } = await getSettings();
  if (!token) throw new Error("Missing API token (open Options and save it).");
  return { Authorization: `Bearer ${token}` };
}

export async function addBookmark(url: string, title?: string) {
  const s = await getSettings();
  const ep = s.endpoints?.bookmarks || "/api/bookmarks";
  const r = await fetch(join(s.baseUrl, ep), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await auth()) },
    body: JSON.stringify({ url, title, isFavorite: false }),
  });
  if (!r.ok) throw new Error(`Bookmark failed: ${r.status}`);
  return r.json().catch(() => ({}));
}

export async function addNote(
  content: string,
  sourceUrl?: string | null,
  title?: string | null,
) {
  const s = await getSettings();
  const ep = s.endpoints?.notes || "/api/notes";

  const safeContent = (content ?? "").toString();
  const finalTitle = (title ?? deriveTitle(safeContent)).trim() || "Note";

  const r = await fetch(join(s.baseUrl, ep), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await auth()) },
    body: JSON.stringify({
      title: finalTitle,
      content: safeContent,
      sourceUrl: sourceUrl ?? null,
    }),
  });
  if (!r.ok) throw new Error(`Note failed: ${r.status}`);
  return r.json().catch(() => ({}));
}

export async function shortenLink(rawUrl: string) {
  const s = await getSettings();
  const ep = s.endpoints?.shorten || "/api/shorten";

  const normalized = normalizeUrl(rawUrl);
  if (!normalized) throw new Error("Invalid URL");

  const r = await fetch(join(s.baseUrl, ep), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await auth()) },
    body: JSON.stringify({
      originalUrl: normalized,
      url: normalized,
      isPublic: true,
    }),
  });
  if (!r.ok) throw new Error(`Shorten failed: ${r.status}`);
  return r.json().catch(() => ({}));
}

export async function uploadFileBlob(
  file: File | Blob,
  name?: string,
  isPublic = true,
) {
  const s = await getSettings();
  const ep = s.endpoints?.files || "/api/upload";
  const fd = new FormData();
  fd.append(
    "file",
    file instanceof File ? file : new File([file], name || "upload.bin"),
  );
  fd.append("isPublic", String(isPublic));
  if (name) fd.append("name", name);

  const r = await fetch(join(s.baseUrl, ep), {
    method: "POST",
    headers: { ...(await auth()) },
    body: fd,
  });
  if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
  return r.json().catch(() => ({}));
}
