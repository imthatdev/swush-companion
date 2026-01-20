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

function useCurrentTab() {
  const [tab, setTab] = React.useState<{ url?: string; title?: string }>({});
  React.useEffect(() => {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([t]) => setTab({ url: t?.url, title: t?.title }));
  }, []);
  return tab;
}

export default function App() {
  const tab = useCurrentTab();
  const [status, setStatus] = React.useState("");
  const [active, setActive] = React.useState<"quick" | "upload" | "notes">(
    "quick",
  );

  return (
    <div className="tabs">
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
          aria-selected={active === "upload"}
          onClick={() => setActive("upload")}
        >
          Upload
        </button>
        <button
          className="tabbtn"
          aria-selected={active === "notes"}
          onClick={() => setActive("notes")}
        >
          Notes
        </button>
      </div>

      {active === "quick" && (
        <Quick
          tabUrl={tab.url || ""}
          tabTitle={tab.title || ""}
          onDone={setStatus}
        />
      )}
      {active === "upload" && <Upload onDone={setStatus} />}
      {active === "notes" && (
        <Notes tabUrl={tab.url || ""} onDone={setStatus} />
      )}

      <div className="status">{status}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "#9ca3af",
        }}
      >
        <a
          href="options.html"
          target="_blank"
          style={{ color: "#6d28d9", textDecoration: "none" }}
        >
          Settings
        </a>
        <span>Swush ♥</span>
      </div>
    </div>
  );
}

function Quick({
  tabUrl,
  tabTitle,
  onDone,
}: {
  tabUrl: string;
  tabTitle: string;
  onDone: (s: string) => void;
}) {
  const [url, setUrl] = React.useState(tabUrl);
  const [title, setTitle] = React.useState(tabTitle);

  const doBookmark = async () => {
    onDone("");
    try {
      await addBookmark(url || tabUrl, title || tabTitle);
      onDone("Bookmark added ✓");
    } catch (e: any) {
      onDone("Error: " + e.message);
    }
  };
  const doShorten = async () => {
    onDone("");
    try {
      const r = await shortenLink(url || tabUrl);
      const slug = r?.slug || r?.short || "";
      onDone("Short link created ✓");
    } catch (e: any) {
      onDone("Error: " + e.message);
    }
  };

  return (
    <div className="card">
      <div className="label">URL</div>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
      />
      <div className="label" style={{ marginTop: 8 }}>
        Title
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Optional"
      />
      <div className="grid2" style={{ marginTop: 8 }}>
        <button className="primary" onClick={doBookmark}>
          Add Bookmark
        </button>
        <button onClick={doShorten}>Shorten</button>
      </div>
    </div>
  );
}

function Upload({ onDone }: { onDone: (s: string) => void }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isPublic, setIsPublic] = React.useState(true);

  const doUpload = async () => {
    onDone("");
    try {
      if (!file) throw new Error("Choose a file");
      const r = await uploadFileBlob(file, file.name, isPublic);
      const url = r?.slug ? `/x/${r.slug}` : r?.url || "";
      onDone(`Uploaded ✓ ${url}`);
    } catch (e: any) {
      onDone("Error: " + e.message);
    }
  };

  return (
    <div className="card">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: "8px 0",
        }}
      >
        <div
          className="switch"
          data-on={isPublic}
          onClick={() => setIsPublic(!isPublic)}
        >
          <div className="knob"></div>
        </div>
        <div className="label" style={{ fontWeight: 500 }}>
          Public
        </div>
      </div>
      <button className="primary" onClick={doUpload}>
        Upload
      </button>
    </div>
  );
}

function Notes({
  tabUrl,
  onDone,
}: {
  tabUrl: string;
  onDone: (s: string) => void;
}) {
  const [content, setContent] = React.useState("");

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
    onDone("");
    try {
      await addNote(content, tabUrl || null);
      setContent("");
      onDone("Note added ✓");
    } catch (e: any) {
      onDone("Error: " + e.message);
    }
  };

  return (
    <div className="card">
      <div className="label">Content</div>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <div className="grid2" style={{ marginTop: 8 }}>
        <button onClick={useSelection}>Use selection</button>
        <button className="primary" onClick={save}>
          Save Note
        </button>
      </div>
    </div>
  );
}
