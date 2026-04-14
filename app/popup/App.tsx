/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical.
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

import * as React from "react";
import {
  addBookmark,
  addNote,
  shortenLink,
  uploadFileBlob,
  addRemoteUpload,
} from "../lib/api";
import {
  AUTO_DETECT_MEDIA_KEY,
  ENABLE_REMOTE_UPLOAD_EMBEDDED_BUTTON_KEY,
  FLOATING_FALLBACK_BUTTON_KEY,
  getSettings,
  saveSettings,
  SMART_UI_ADAPTATION_KEY,
  type Settings,
} from "../lib/storage";
import { fetchTags, ensureTags } from "../lib/tag-api";
import { TagInput } from "../components/TagInput";
import {
  SITE_WHITELIST_STORAGE_KEY,
  addWhitelistedDomain,
  extractDomainFromUrl,
  getWhitelistedDomains,
  matchesWhitelistedDomain,
  normalizeDomain,
  removeWhitelistedDomain,
} from "../storage/site-whitelist";

const POPUP_LAST_TAB_KEY = "popupLastActiveTab";
const POPUP_SITE_CACHE_KEY = "popupCachedUploadButtonSites";

const SETTINGS_SYNC_KEYS = [
  "baseUrl",
  "apiKey",
  "token",
  ENABLE_REMOTE_UPLOAD_EMBEDDED_BUTTON_KEY,
  SMART_UI_ADAPTATION_KEY,
  FLOATING_FALLBACK_BUTTON_KEY,
  AUTO_DETECT_MEDIA_KEY,
] as const;

type PopupTab = "sites" | "bookmark" | "shorten" | "notes" | "upload";

function isPopupTab(value: unknown): value is PopupTab {
  return (
    value === "sites" ||
    value === "bookmark" ||
    value === "shorten" ||
    value === "notes" ||
    value === "upload"
  );
}

function useCurrentTab() {
  const [tab, setTab] = React.useState<{
    url?: string;
    title?: string;
    domain?: string;
  }>({});
  React.useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) =>
      setTab({
        url: t?.url,
        title: t?.title,
        domain: extractDomainFromUrl(t?.url || ""),
      }),
    );
  }, []);
  return tab;
}

function normalizeSiteList(raw: unknown) {
  if (!Array.isArray(raw)) return [] as string[];

  const cleaned = raw
    .map((item) => normalizeDomain(String(item)))
    .filter(Boolean);

  return Array.from(new Set(cleaned)).sort((a, b) => a.localeCompare(b));
}

function hasStorageChanges(
  changes: Record<string, chrome.storage.StorageChange>,
  keys: readonly string[],
) {
  return keys.some((key) => Boolean(changes[key]));
}

function useWhitelistedSites() {
  const [sites, setSites] = React.useState<string[]>([]);

  React.useEffect(() => {
    let mounted = true;

    const updateSites = (next: string[]) => {
      if (!mounted) return;
      setSites(next);
      chrome.storage.local.set({ [POPUP_SITE_CACHE_KEY]: next }).catch(() => {
        // ignore local cache write errors
      });
    };

    const loadFromLocalCache = async () => {
      try {
        const data = await chrome.storage.local.get([POPUP_SITE_CACHE_KEY]);
        const cached = normalizeSiteList(data?.[POPUP_SITE_CACHE_KEY]);
        if (cached.length > 0) {
          updateSites(cached);
        }
      } catch {
        // ignore local cache read errors
      }
    };

    const load = async () => {
      const next = await getWhitelistedDomains();
      updateSites(next);
    };

    void loadFromLocalCache();
    void load();

    const onChange: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, area) => {
      if (area !== "sync") return;
      if (!changes[SITE_WHITELIST_STORAGE_KEY]) return;
      const next = normalizeSiteList(
        changes[SITE_WHITELIST_STORAGE_KEY].newValue,
      );
      updateSites(next);
    };

    chrome.storage.onChanged.addListener(onChange);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);

  return [sites, setSites] as const;
}

function useSettings() {
  const [settings, setSettings] = React.useState<Settings>({
    baseUrl: "",
    apiKey: "",
    enableRemoteUploadEmbeddedButton: true,
    smartUiAdaptation: true,
    floatingFallbackButton: true,
    autoDetectMedia: true,
  });

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      const s = await getSettings();
      if (mounted) setSettings(s);
    };
    void load();

    const handleChange: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, area) => {
      if (area !== "sync") return;
      if (!hasStorageChanges(changes, SETTINGS_SYNC_KEYS)) return;
      void load();
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(handleChange);
    };
  }, []);

  return settings;
}

export default function App() {
  const tab = useCurrentTab();
  const settings = useSettings();
  const [whitelistedSites, setWhitelistedSites] = useWhitelistedSites();
  const connected = Boolean(settings.baseUrl && settings.apiKey);
  const [status, setStatus] = React.useState({
    tone: "muted",
    message: "",
  });
  const [active, setActive] = React.useState<PopupTab>("bookmark");
  const [siteSearch, setSiteSearch] = React.useState("");
  const [newSiteDomain, setNewSiteDomain] = React.useState("");
  const [siteActionLoading, setSiteActionLoading] = React.useState(false);
  const [behaviorActionLoading, setBehaviorActionLoading] =
    React.useState(false);

  const currentDomain = normalizeDomain(tab.domain || "");
  const currentSiteEnabled = currentDomain
    ? matchesWhitelistedDomain(currentDomain, whitelistedSites)
    : false;
  const filteredSites = React.useMemo(() => {
    const q = siteSearch.trim().toLowerCase();
    if (!q) return whitelistedSites;
    return whitelistedSites.filter((site) => site.includes(q));
  }, [siteSearch, whitelistedSites]);

  React.useEffect(() => {
    chrome.storage.local
      .get([POPUP_LAST_TAB_KEY])
      .then((data) => {
        const saved = data?.[POPUP_LAST_TAB_KEY];
        if (isPopupTab(saved)) setActive(saved);
      })
      .catch(() => {
        // ignore storage read errors
      });
  }, []);

  React.useEffect(() => {
    chrome.storage.local.set({ [POPUP_LAST_TAB_KEY]: active }).catch(() => {
      // ignore storage write errors
    });
  }, [active]);

  const setMessage = (tone: "muted" | "success" | "error", message: string) =>
    setStatus({ tone, message });

  const openOptions = () => chrome.runtime.openOptionsPage();

  const saveBehaviorPatch = async (
    patch: Partial<Settings>,
    successMessage: string,
  ) => {
    if (behaviorActionLoading) return;
    setBehaviorActionLoading(true);
    try {
      await saveSettings(patch);
      setMessage("success", successMessage);
    } catch (err: any) {
      setMessage("error", err?.message || "Failed to update behavior");
    } finally {
      setBehaviorActionLoading(false);
    }
  };

  const toggleCurrentSite = async () => {
    if (!currentDomain || siteActionLoading) return;

    setSiteActionLoading(true);
    try {
      const next = currentSiteEnabled
        ? await removeWhitelistedDomain(currentDomain)
        : await addWhitelistedDomain(currentDomain);
      setWhitelistedSites(next);
      setMessage(
        "success",
        currentSiteEnabled
          ? `Disabled on ${currentDomain}`
          : `Enabled on ${currentDomain}`,
      );
    } catch (err: any) {
      setMessage("error", err?.message || "Failed to update site settings");
    } finally {
      setSiteActionLoading(false);
    }
  };

  const addSite = async () => {
    if (siteActionLoading) return;

    const domain = normalizeDomain(newSiteDomain);
    if (!domain) {
      setMessage("error", "Enter a valid domain");
      return;
    }

    setSiteActionLoading(true);
    try {
      const next = await addWhitelistedDomain(domain);
      setWhitelistedSites(next);
      setNewSiteDomain("");
      setMessage("success", `Enabled on ${domain}`);
    } catch (err: any) {
      setMessage("error", err?.message || "Failed to add site");
    } finally {
      setSiteActionLoading(false);
    }
  };

  const removeSite = async (domain: string) => {
    if (siteActionLoading) return;
    setSiteActionLoading(true);
    try {
      const next = await removeWhitelistedDomain(domain);
      setWhitelistedSites(next);
      setMessage("success", `Removed ${domain}`);
    } catch (err: any) {
      setMessage("error", err?.message || "Failed to remove site");
    } finally {
      setSiteActionLoading(false);
    }
  };

  return (
    <div className="popup">
      <div className="tabbar">
        <button
          className="tabbtn"
          aria-selected={active === "sites"}
          onClick={() => setActive("sites")}
        >
          <span className="tab-label">Overview</span>
        </button>
        <button
          className="tabbtn"
          aria-selected={active === "bookmark"}
          onClick={() => setActive("bookmark")}
        >
          <span className="tab-label">Bookmark</span>
        </button>
        <button
          className="tabbtn"
          aria-selected={active === "shorten"}
          onClick={() => setActive("shorten")}
        >
          Shorten
        </button>
        <button
          className="tabbtn"
          aria-selected={active === "notes"}
          onClick={() => setActive("notes")}
        >
          <span className="tab-label">Notes</span>
        </button>
        <button
          className="tabbtn"
          aria-selected={active === "upload"}
          onClick={() => setActive("upload")}
        >
          Upload
        </button>
      </div>

      {active === "sites" && (
        <>
          <section className="card site-controls">
            <div className="card-header">
              <div>
                <h2>Current Site</h2>
                <p>Control Upload to Swush for the tab you are on now.</p>
              </div>
              <div
                className={`pill ${currentSiteEnabled ? "pill-ok" : "pill-warn"}`}
              >
                {currentSiteEnabled ? "Enabled" : "Not enabled"}
              </div>
            </div>

            <div className="site-current-row">
              <div>
                <div className="label">Domain</div>
                <div className="site-chip">
                  {currentDomain || "Unavailable"}
                </div>
              </div>
              <button
                className={currentSiteEnabled ? "secondary" : "primary"}
                disabled={!currentDomain || siteActionLoading}
                aria-busy={siteActionLoading}
                onClick={toggleCurrentSite}
              >
                {currentSiteEnabled
                  ? "Disable on this Site"
                  : "Enable on this Site"}
              </button>
            </div>
          </section>

          <section className="card site-controls">
            <div className="card-header">
              <div>
                <h2>Enabled Sites</h2>
                <p>
                  Add, search, and remove domains where the embedded upload
                  button should appear.
                </p>
              </div>
              <div className="pill">{whitelistedSites.length} active</div>
            </div>

            <label className="field">
              <span>Search domains</span>
              <input
                type="text"
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder="Search domains..."
              />
            </label>

            <label className="field">
              <div className="field-with-action">
                <span>Add domain</span>
                <button
                  type="button"
                  className="secondary tiny-btn"
                  onClick={() => void addSite()}
                  disabled={siteActionLoading}
                >
                  Add
                </button>
              </div>
              <input
                type="text"
                value={newSiteDomain}
                onChange={(e) => setNewSiteDomain(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void addSite();
                }}
                placeholder="example.com"
              />
            </label>

            {filteredSites.length === 0 ? (
              <div className="helper">
                {whitelistedSites.length === 0
                  ? "No sites enabled yet. Enable the current site to start."
                  : "No sites match this search."}
              </div>
            ) : (
              <ul className="site-list">
                {filteredSites.map((site) => (
                  <li key={site} className="site-list-item">
                    <div className="site-meta">
                      <span className="mono">{site}</span>
                      {site === currentDomain && (
                        <span className="site-badge">Current</span>
                      )}
                    </div>
                    <button
                      className="tiny-btn"
                      onClick={() => void removeSite(site)}
                      disabled={siteActionLoading}
                    >
                      Disable
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="helper">
              Popup uses a local cache for fast open and stays synced with
              storage updates.
            </div>
          </section>

          <section className="card site-controls">
            <div className="card-header">
              <div>
                <h2>Behavior</h2>
                <p>
                  Fine tune how smart upload buttons are detected and styled.
                </p>
              </div>
            </div>

            <div className="pref-row">
              <div>
                <div className="label">Enable embedded upload button</div>
                <div className="helper">
                  Master switch for all page injection.
                </div>
              </div>
              <button
                type="button"
                className={`toggle ${settings.enableRemoteUploadEmbeddedButton ? "toggle-on" : ""}`}
                onClick={() =>
                  void saveBehaviorPatch(
                    {
                      enableRemoteUploadEmbeddedButton:
                        !settings.enableRemoteUploadEmbeddedButton,
                    },
                    settings.enableRemoteUploadEmbeddedButton
                      ? "Embedded upload button disabled"
                      : "Embedded upload button enabled",
                  )
                }
                disabled={behaviorActionLoading}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="pref-row">
              <div>
                <div className="label">Smart UI adaptation</div>
                <div className="helper">
                  Match each site&apos;s native button appearance.
                </div>
              </div>
              <button
                type="button"
                className={`toggle ${settings.smartUiAdaptation ? "toggle-on" : ""}`}
                onClick={() =>
                  void saveBehaviorPatch(
                    { smartUiAdaptation: !settings.smartUiAdaptation },
                    settings.smartUiAdaptation
                      ? "Smart UI adaptation disabled"
                      : "Smart UI adaptation enabled",
                  )
                }
                disabled={behaviorActionLoading}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="pref-row">
              <div>
                <div className="label">Auto-detect nearby media</div>
                <div className="helper">
                  Prefer media URLs over page URLs when available.
                </div>
              </div>
              <button
                type="button"
                className={`toggle ${settings.autoDetectMedia ? "toggle-on" : ""}`}
                onClick={() =>
                  void saveBehaviorPatch(
                    { autoDetectMedia: !settings.autoDetectMedia },
                    settings.autoDetectMedia
                      ? "Auto media detection disabled"
                      : "Auto media detection enabled",
                  )
                }
                disabled={behaviorActionLoading}
              >
                <span className="toggle-knob" />
              </button>
            </div>

            <div className="pref-row">
              <div>
                <div className="label">Floating fallback button</div>
                <div className="helper">
                  Show floating action when no inline placement is found.
                </div>
              </div>
              <button
                type="button"
                className={`toggle ${settings.floatingFallbackButton ? "toggle-on" : ""}`}
                onClick={() =>
                  void saveBehaviorPatch(
                    {
                      floatingFallbackButton: !settings.floatingFallbackButton,
                    },
                    settings.floatingFallbackButton
                      ? "Floating fallback disabled"
                      : "Floating fallback enabled",
                  )
                }
                disabled={behaviorActionLoading}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </section>

          <section className="card site-controls">
            <div className="card-header">
              <div>
                <h2>Account</h2>
                <p>Connection status and API settings for this extension.</p>
              </div>
              <div className={`pill ${connected ? "pill-ok" : "pill-warn"}`}>
                {connected ? "Connected" : "Not connected"}
              </div>
            </div>

            <div>
              <div className="label">Base URL</div>
              <div className="site-chip">{settings.baseUrl || "Not set"}</div>
            </div>

            <button
              className={connected ? "secondary" : "primary"}
              onClick={openOptions}
            >
              {connected ? "Manage Connection" : "Connect your Swush"}
            </button>
          </section>

          <section className="card site-controls">
            <div className="card-header">
              <div>
                <h2>Support</h2>
                <p>Help keep Swush and it's functionality improving.</p>
              </div>
            </div>

            <div className="support-links">
              <a
                className="link"
                href="https://iconical.dev/sponsor"
                target="_blank"
                rel="noreferrer"
              >
                Sponsor the project
              </a>
              <a
                className="link"
                href="https://github.com/imthatdev/swush-companion/issues"
                target="_blank"
                rel="noreferrer"
              >
                Report an issue
              </a>
              <a
                className="link"
                href="https://iconical.dev"
                target="_blank"
                rel="noreferrer"
              >
                iconical.dev
              </a>
            </div>
          </section>
        </>
      )}

      {!connected && active !== "sites" ? (
        <section className="card card-cta">
          <h2>Connect your Swush</h2>
          <p>
            Add your base URL, then approve access on your Swush account to
            issue an API key.
          </p>
          <button className="primary" onClick={openOptions}>
            Open connection settings
          </button>
        </section>
      ) : null}

      {connected ? (
        <>
          {active === "bookmark" && (
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Bookmark</h2>
                  <p>Save the current page or a link.</p>
                </div>
              </div>
              <Bookmarks
                tabUrl={tab.url || ""}
                tabTitle={tab.title || ""}
                onDone={setMessage}
              />
            </section>
          )}

          {active === "shorten" && (
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Shorten</h2>
                  <p>Create a short link quickly.</p>
                </div>
              </div>
              <ShortLinks tabUrl={tab.url || ""} onDone={setMessage} />
            </section>
          )}

          {active === "notes" && (
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>
                    Notes <span className="soon-badge">Coming Soon</span>
                  </h2>
                  <p>Capture ideas with a source link attached.</p>
                </div>
              </div>
              <Notes tabUrl={tab.url || ""} onDone={setMessage} />
            </section>
          )}

          {active === "upload" && (
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Upload</h2>
                  <p>Send a file or image to your Swush vault.</p>
                </div>
              </div>
              <Upload baseUrl={settings.baseUrl} onDone={setMessage} />
            </section>
          )}
        </>
      ) : null}

      {status.message ? (
        <div className={`status status-${status.tone}`}>{status.message}</div>
      ) : null}
    </div>
  );
}

function Bookmarks({
  tabUrl,
  tabTitle,
  onDone,
}: {
  tabUrl: string;
  tabTitle: string;
  onDone: (tone: "muted" | "success" | "error", s: string) => void;
}) {
  const [url, setUrl] = React.useState(tabUrl);
  const [title, setTitle] = React.useState(tabTitle);
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = React.useState<string[]>([]);
  const [bookmarkPublic, setBookmarkPublic] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetchTags("bookmark")
      .then(setTagSuggestions)
      .catch(() => setTagSuggestions([]));
  }, []);

  const doBookmark = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onDone("muted", "");
    try {
      const finalUrl = url || tabUrl;
      if (!finalUrl) throw new Error("Enter a URL");
      let tagList: string[] = [];
      if (tags.length) {
        tagList = await ensureTags("bookmark", tags);
      }
      await addBookmark(finalUrl, title || tabTitle, tagList, {
        isPublic: bookmarkPublic,
      });
      onDone("success", "Bookmark added ✓");
    } catch (e: any) {
      onDone("error", `Error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <label className="field">
        <span>URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <label className="field">
        <span>Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional"
        />
      </label>
      <label className="field">
        <span>Tags</span>
        <TagInput
          value={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          placeholder="Add tag"
        />
      </label>
      <div className="inline">
        <button
          type="button"
          className={`toggle ${bookmarkPublic ? "toggle-on" : ""}`}
          onClick={() => setBookmarkPublic(!bookmarkPublic)}
        >
          <span className="toggle-knob" />
        </button>
        <div>
          <div className="label">Bookmark public</div>
          <div className="helper">
            {bookmarkPublic ? "Visible on your profile." : "Private to you."}
          </div>
        </div>
      </div>
      <div className="grid2">
        <button
          className="primary"
          onClick={doBookmark}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save bookmark"}
        </button>
      </div>
    </div>
  );
}

function ShortLinks({
  tabUrl,
  onDone,
}: {
  tabUrl: string;
  onDone: (tone: "muted" | "success" | "error", s: string) => void;
}) {
  const [url, setUrl] = React.useState(tabUrl);
  const [isPublic, setIsPublic] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  type ShortenLinkResponse = {
    slug?: string;
    short?: string;
    shortUrl?: string;
    url?: string;
    data?: {
      slug?: string;
      short?: string;
      shortUrl?: string;
      url?: string;
    };
  };

  const doShorten = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onDone("muted", "");
    try {
      const finalUrl = url || tabUrl;
      if (!finalUrl) throw new Error("Enter a URL");
      const r = (await shortenLink(finalUrl, {
        isPublic,
      })) as ShortenLinkResponse;
      const shortUrl =
        r?.data?.shortUrl || r?.data?.url || r?.shortUrl || r?.url || "";
      onDone(
        "success",
        shortUrl ? `Short link copied ✓` : "Short link created ✓",
      );
      if (shortUrl && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shortUrl);
        } catch {
          // ignore clipboard errors
        }
      }
    } catch (e: any) {
      onDone("error", `Error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <label className="field">
        <span>URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <div className="inline">
        <button
          type="button"
          className={`toggle ${isPublic ? "toggle-on" : ""}`}
          onClick={() => setIsPublic(!isPublic)}
        >
          <span className="toggle-knob" />
        </button>
        <div>
          <div className="label">Public short link</div>
          <div className="helper">
            {isPublic ? "Anyone can access it." : "Private to you."}
          </div>
        </div>
      </div>
      <button
        className="primary"
        onClick={doShorten}
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Create short link"}
      </button>
    </div>
  );
}

function Upload({
  onDone,
  baseUrl,
}: {
  onDone: (tone: "muted" | "success" | "error", s: string) => void;
  baseUrl: string;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isPublic, setIsPublic] = React.useState(true);
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = React.useState<string[]>([]);
  const [description, setDescription] = React.useState("");
  const [folderName, setFolderName] = React.useState("");
  const [remoteUrl, setRemoteUrl] = React.useState("");
  const [isUploadingFile, setIsUploadingFile] = React.useState(false);
  const [isUploadingRemoteUrl, setIsUploadingRemoteUrl] = React.useState(false);
  const [isPastingRemoteUrl, setIsPastingRemoteUrl] = React.useState(false);

  React.useEffect(() => {
    fetchTags("upload")
      .then(setTagSuggestions)
      .catch(() => setTagSuggestions([]));
  }, []);

  const normalizeClipboardUrl = React.useCallback((input: string) => {
    const text = (input || "").trim();
    if (!text) return null;

    try {
      const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
      const parsed = new URL(candidate);
      if (!/^https?:$/i.test(parsed.protocol)) return null;
      return candidate;
    } catch {
      return null;
    }
  }, []);

  const pasteClipboardIntoRemoteUrl = React.useCallback(
    async (showMessageOnFailure: boolean) => {
      if (isPastingRemoteUrl) return;
      if (!navigator.clipboard?.readText) {
        if (showMessageOnFailure) {
          onDone("error", "Clipboard access is not available.");
        }
        return;
      }

      setIsPastingRemoteUrl(true);
      try {
        const text = await navigator.clipboard.readText();
        const normalized = normalizeClipboardUrl(text);
        if (!normalized) {
          if (showMessageOnFailure) {
            onDone("error", "Clipboard does not contain a valid URL.");
          }
          return;
        }

        setRemoteUrl(normalized);
      } catch {
        if (showMessageOnFailure) {
          onDone("error", "Failed to read clipboard.");
        }
      } finally {
        setIsPastingRemoteUrl(false);
      }
    },
    [isPastingRemoteUrl, normalizeClipboardUrl, onDone],
  );

  React.useEffect(() => {
    if (remoteUrl.trim()) return;
    void pasteClipboardIntoRemoteUrl(false);
  }, []);

  type UploadFileBlobResponse = {
    slug?: string;
    url?: string;
  };

  const doUpload = async () => {
    if (isUploadingFile) return;
    setIsUploadingFile(true);
    onDone("muted", "");
    try {
      if (!file) throw new Error("Choose a file");
      let tagList: string[] = [];
      if (tags.length) {
        tagList = await ensureTags("upload", tags);
      }
      const r = (await uploadFileBlob(file, file.name, isPublic, tagList, {
        description: description.trim() || undefined,
        folderName: folderName.trim() || undefined,
      })) as UploadFileBlobResponse;
      const url = r?.slug
        ? `${baseUrl.replace(/\/+$/, "")}/x/${r.slug}`
        : r?.url || "";
      if (url && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          // ignore clipboard errors
        }
      }
      onDone("success", url ? "Upload complete ✓ Link copied" : "Uploaded ✓");
    } catch (e: any) {
      onDone("error", `Error: ${e.message}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const doRemoteUpload = async () => {
    if (isUploadingRemoteUrl) return;
    setIsUploadingRemoteUrl(true);
    onDone("muted", "");
    try {
      const value = remoteUrl.trim();
      if (!value) throw new Error("Enter a URL");
      await addRemoteUpload(value);
      setRemoteUrl("");
      onDone("success", "Remote upload added ✓");
    } catch (e: any) {
      onDone("error", `Error: ${e.message}`);
    } finally {
      setIsUploadingRemoteUrl(false);
    }
  };

  return (
    <div className="stack">
      <label className="field">
        <div className="field-with-action">
          <span>Remote URL</span>
          <button
            type="button"
            className="secondary tiny-btn"
            onClick={() => void pasteClipboardIntoRemoteUrl(true)}
            disabled={isPastingRemoteUrl}
            aria-busy={isPastingRemoteUrl}
          >
            {isPastingRemoteUrl ? "Pasting..." : "Paste"}
          </button>
        </div>
        <input
          type="url"
          value={remoteUrl}
          onChange={(e) => setRemoteUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <button
        className="secondary"
        onClick={doRemoteUpload}
        disabled={isUploadingRemoteUrl}
        aria-busy={isUploadingRemoteUrl}
      >
        {isUploadingRemoteUrl ? "Adding URL..." : "Add URL to remote upload"}
      </button>

      <div className="divider" />

      <label className="field">
        <span>File</span>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
      <label className="field">
        <span>Description (optional)</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description"
        />
      </label>
      <label className="field">
        <span>Folder (optional)</span>
        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="e.g. Invoices / 2026"
        />
      </label>
      <div className="inline">
        <button
          type="button"
          className={`toggle ${isPublic ? "toggle-on" : ""}`}
          onClick={() => setIsPublic(!isPublic)}
        >
          <span className="toggle-knob" />
        </button>
        <div>
          <div className="label">Public link</div>
          <div className="helper">
            {isPublic ? "Visible via a share link." : "Private to you."}
          </div>
        </div>
      </div>
      <label className="field">
        <span>Tags</span>
        <TagInput
          value={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          placeholder="Add tag"
        />
      </label>
      <button
        className="primary"
        onClick={doUpload}
        disabled={isUploadingFile}
        aria-busy={isUploadingFile}
      >
        {isUploadingFile ? "Uploading..." : "Upload to Swush"}
      </button>
    </div>
  );
}

function Notes({
  tabUrl,
  onDone,
}: {
  tabUrl: string;
  onDone: (tone: "muted" | "success" | "error", s: string) => void;
}) {
  const [content, setContent] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = React.useState<string[]>([]);
  const [isPublic, setIsPublic] = React.useState(false);
  const [isUsingSelection, setIsUsingSelection] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    fetchTags("note")
      .then(setTagSuggestions)
      .catch(() => setTagSuggestions([]));
  }, []);

  const useSelection = async () => {
    if (isUsingSelection) return;
    setIsUsingSelection(true);
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    try {
      const [{ result: sel = "" } = {}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: () => window.getSelection()?.toString() || "",
      });
      setContent((c) => (c ? `${c}\n${sel}` : sel));
    } finally {
      setIsUsingSelection(false);
    }
  };
  const save = async () => {
    if (isSaving) return;
    setIsSaving(true);
    onDone("muted", "");
    try {
      if (!content.trim()) throw new Error("Write a note first");
      let tagList: string[] = [];
      if (tags.length) {
        tagList = await ensureTags("note", tags);
      }
      await addNote(content, tabUrl || null, title || null, tagList, {
        isPublic,
      });
      setContent("");
      setTitle("");
      setTags([]);
      onDone("success", "Note added ✓");
    } catch (e: any) {
      onDone("error", `Error: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="stack">
      <label className="field">
        <span>Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional"
        />
      </label>
      <label className="field">
        <span>Content</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Drop your note here..."
        />
      </label>
      <label className="field">
        <span>Tags</span>
        <TagInput
          value={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
          placeholder="Add tag"
        />
      </label>
      <div className="inline">
        <button
          type="button"
          className={`toggle ${isPublic ? "toggle-on" : ""}`}
          onClick={() => setIsPublic(!isPublic)}
        >
          <span className="toggle-knob" />
        </button>
        <div>
          <div className="label">Public note</div>
          <div className="helper">
            {isPublic ? "Visible on your profile." : "Private to you."}
          </div>
        </div>
      </div>
      <div className="grid2">
        <button
          className="secondary"
          onClick={useSelection}
          disabled={isUsingSelection}
          aria-busy={isUsingSelection}
        >
          {isUsingSelection ? "Collecting..." : "Use selection"}
        </button>
        <button
          className="primary"
          onClick={save}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? "Saving..." : "Save note"}
        </button>
      </div>
    </div>
  );
}
