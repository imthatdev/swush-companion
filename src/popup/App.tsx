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
import { addBookmark, addNote, shortenLink, uploadFileBlob } from "../lib/api";
import { getSettings } from "../lib/storage";

function useCurrentTab() {
  const [tab, setTab] = React.useState<{ url?: string; title?: string }>({});
  React.useEffect(() => {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([t]) => setTab({ url: t?.url, title: t?.title }));
  }, []);
  return tab;
}

function useSettings() {
  const [settings, setSettings] = React.useState({
    baseUrl: "",
    apiKey: "",
  });

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      const s = await getSettings();
      if (mounted) setSettings(s);
    };
    load();

    const handleChange: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, area) => {
      if (area !== "sync") return;
      setSettings((prev) => ({
        baseUrl: changes.baseUrl
          ? changes.baseUrl.newValue || ""
          : prev.baseUrl,
        apiKey: changes.apiKey ? changes.apiKey.newValue || "" : prev.apiKey,
      }));
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
  const connected = Boolean(settings.baseUrl && settings.apiKey);
  const [status, setStatus] = React.useState({
    tone: "muted",
    message: "",
  });
  const [active, setActive] = React.useState<"quick" | "notes" | "upload">(
    "quick",
  );

  const setMessage = (tone: "muted" | "success" | "error", message: string) =>
    setStatus({ tone, message });

  const openOptions = () => chrome.runtime.openOptionsPage();

  return (
    <div className="popup">
      {!connected ? (
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
      ) : (
        <>
          <div className="tabbar">
            <button
              className="tabbtn"
              aria-selected={active === "quick"}
              onClick={() => setActive("quick")}
            >
              Quick
            </button>
            <button
              className="tabbtn"
              aria-selected={active === "notes"}
              onClick={() => setActive("notes")}
            >
              Notes
            </button>
            <button
              className="tabbtn"
              aria-selected={active === "upload"}
              onClick={() => setActive("upload")}
            >
              Upload
            </button>
          </div>

          {active === "quick" && (
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Quick actions</h2>
                  <p>Save the current page or shorten a link fast.</p>
                </div>
              </div>
              <Quick
                tabUrl={tab.url || ""}
                tabTitle={tab.title || ""}
                baseUrl={settings.baseUrl}
                onDone={setMessage}
              />
            </section>
          )}

          {active === "notes" && (
            <section className="card">
              <div className="card-header">
                <div>
                  <h2>Notes</h2>
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
      )}

      <div className={`status status-${status.tone}`}>{status.message}</div>
      <footer className="popup-footer">
        <div className="popup-footer-links">
          <button className="link" onClick={openOptions}>
            Settings
          </button>
          <a
            className="link"
            href="https://iconical.dev/sponsor"
            target="_blank"
            rel="noreferrer"
          >
            Sponsor
          </a>
        </div>
        <span>Swush ♥</span>
      </footer>
    </div>
  );
}

function Quick({
  tabUrl,
  tabTitle,
  onDone,
  baseUrl,
}: {
  tabUrl: string;
  tabTitle: string;
  baseUrl: string;
  onDone: (tone: "muted" | "success" | "error", s: string) => void;
}) {
  const [url, setUrl] = React.useState(tabUrl);
  const [title, setTitle] = React.useState(tabTitle);

  const doBookmark = async () => {
    onDone("muted", "");
    try {
      const finalUrl = url || tabUrl;
      if (!finalUrl) throw new Error("Enter a URL");
      await addBookmark(finalUrl, title || tabTitle);
      onDone("success", "Bookmark added ✓");
    } catch (e: any) {
      onDone("error", `Error: ${e.message}`);
    }
  };
  const doShorten = async () => {
    onDone("muted", "");
    try {
      const finalUrl = url || tabUrl;
      if (!finalUrl) throw new Error("Enter a URL");
      const r = await shortenLink(finalUrl);
      const slug = r?.slug || r?.short || "";
      const shortUrl =
        r?.shortUrl ||
        r?.url ||
        (slug ? `${baseUrl.replace(/\/+$/, "")}/x/${slug}` : "");
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
      <div className="grid2">
        <button className="primary" onClick={doBookmark}>
          Save bookmark
        </button>
        <button className="secondary" onClick={doShorten}>
          Shorten link
        </button>
      </div>
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

  const doUpload = async () => {
    onDone("muted", "");
    try {
      if (!file) throw new Error("Choose a file");
      const r = await uploadFileBlob(file, file.name, isPublic);
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
    }
  };

  return (
    <div className="stack">
      <label className="field">
        <span>File</span>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
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
      <button className="primary" onClick={doUpload}>
        Upload to Swush
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

  const useSelection = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const [{ result: sel = "" } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => window.getSelection()?.toString() || "",
    });
    setContent((c) => (c ? `${c}\n${sel}` : sel));
  };
  const save = async () => {
    onDone("muted", "");
    try {
      if (!content.trim()) throw new Error("Write a note first");
      await addNote(content, tabUrl || null, title || null);
      setContent("");
      setTitle("");
      onDone("success", "Note added ✓");
    } catch (e: any) {
      onDone("error", `Error: ${e.message}`);
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
      <div className="grid2">
        <button className="secondary" onClick={useSelection}>
          Use selection
        </button>
        <button className="primary" onClick={save}>
          Save note
        </button>
      </div>
    </div>
  );
}
