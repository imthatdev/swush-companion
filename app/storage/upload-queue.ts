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

export const REMOTE_UPLOAD_QUEUE_KEY = "swushRemoteUploadQueue";

export type QueuedRemoteUpload = {
  id: string;
  url: string;
  title: string;
  attempts: number;
  createdAt: number;
};

function toQueueItem(raw: unknown): QueuedRemoteUpload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<QueuedRemoteUpload>;
  if (!obj.id || !obj.url) return null;

  return {
    id: String(obj.id),
    url: String(obj.url),
    title: typeof obj.title === "string" ? obj.title : "Remote upload",
    attempts: Number.isFinite(obj.attempts) ? Number(obj.attempts) : 0,
    createdAt: Number.isFinite(obj.createdAt)
      ? Number(obj.createdAt)
      : Date.now(),
  };
}

export async function getQueuedRemoteUploads() {
  const data = await chrome.storage.local.get([REMOTE_UPLOAD_QUEUE_KEY]);
  const raw = data[REMOTE_UPLOAD_QUEUE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .map(toQueueItem)
    .filter((item): item is QueuedRemoteUpload => !!item);
}

export async function setQueuedRemoteUploads(items: QueuedRemoteUpload[]) {
  await chrome.storage.local.set({ [REMOTE_UPLOAD_QUEUE_KEY]: items });
}

export async function enqueueRemoteUpload(url: string, title: string) {
  const current = await getQueuedRemoteUploads();
  const next: QueuedRemoteUpload = {
    id: crypto.randomUUID(),
    url,
    title: title || "Remote upload",
    attempts: 0,
    createdAt: Date.now(),
  };
  await setQueuedRemoteUploads([...current, next]);
  return next;
}
