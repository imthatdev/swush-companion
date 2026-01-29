import { getSettings } from "./storage";

const TAG_ENDPOINTS = {
  bookmark: "/api/v1/bookmark-tags",
  note: "/api/v1/note-tags",
  upload: "/api/v1/tags",
  shortlink: "/api/v1/shortlink-tags",
  recipe: "/api/v1/recipe-tags",
};

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

function join(base: string, seg: string) {
  return `${base}${seg.startsWith("/") ? seg : `/${seg}`}`;
}

export async function fetchTags(
  type: keyof typeof TAG_ENDPOINTS,
): Promise<string[]> {
  const baseUrl = await getBaseUrl();
  const res = await fetch(join(baseUrl, TAG_ENDPOINTS[type]), {
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (Array.isArray(data)) {
    return data
      .map((item) =>
        typeof item === "string"
          ? item
          : typeof item?.name === "string"
            ? item.name
            : null,
      )
      .filter((name): name is string => Boolean(name));
  }
  if (Array.isArray(data.tags)) return data.tags;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

export async function createTag(
  type: keyof typeof TAG_ENDPOINTS,
  name: string,
  color?: string,
) {
  const baseUrl = await getBaseUrl();
  const res = await fetch(join(baseUrl, TAG_ENDPOINTS[type]), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error("Failed to create tag");
  return res.json();
}

export async function ensureTags(
  type: keyof typeof TAG_ENDPOINTS,
  tags: string[],
): Promise<string[]> {
  if (type === "upload") {
    return tags;
  }
  const existing = await fetchTags(type);
  const toCreate = tags.filter((t) => !existing.includes(t));
  for (const tag of toCreate) {
    try {
      await createTag(type, tag);
    } catch {}
  }
  return tags;
}
