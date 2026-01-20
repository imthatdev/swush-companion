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

import * as React from "react";
import { saveSettings, getSettings } from "../lib/storage";

export default function OptionsApp() {
  const [baseUrl, setBaseUrl] = React.useState("");
  const [token, setToken] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [endpoints, setEndpoints] = React.useState({
    bookmarks: "/api/v1/bookmarks",
    notes: "/api/v1/notes",
    files: "/api/v1/upload",
    shorten: "/api/v1/shorten",
  });
  const EXTENSION_ID = "swush-companion";
  const [loginInProgress, setLoginInProgress] = React.useState(false);
  const [redirectUrl, setRedirectUrl] = React.useState<string>("");
  React.useEffect(() => {
    if (chrome && chrome.identity && chrome.identity.getRedirectURL) {
      setRedirectUrl(chrome.identity.getRedirectURL());
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      const s = await getSettings();
      setBaseUrl(s.baseUrl || "");
      setToken(s.token || "");
      setEndpoints({
        bookmarks: s.endpoints?.bookmarks || "/api/v1/bookmarks",
        notes: s.endpoints?.notes || "/api/v1/notes",
        files: s.endpoints?.files || "/api/v1/upload",
        shorten: s.endpoints?.shorten || "/api/v1/shorten",
      });
    })();
  }, []);

  async function save() {
    setStatus("");
    try {
      await saveSettings({ baseUrl, token, endpoints });
      setStatus("Saved ✓");
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  }

  async function handleLogin() {
    if (!baseUrl) {
      setStatus("Please enter your main URL first.");
      return;
    }
    if (!redirectUrl) {
      setStatus("Extension redirect URL not available.");
      return;
    }
    setLoginInProgress(true);
    setStatus("");
    const loginUrl = `${baseUrl.replace(/\/$/, "")}/api/v1/auth/extension-login?redirect_uri=${encodeURIComponent(redirectUrl)}&extension_id=${encodeURIComponent(EXTENSION_ID)}`;
    chrome.identity.launchWebAuthFlow(
      {
        url: loginUrl,
        interactive: true,
      },
      (redirectedTo) => {
        setLoginInProgress(false);
        if (chrome.runtime.lastError) {
          setStatus("Login failed: " + chrome.runtime.lastError.message);
          return;
        }
        if (redirectedTo) {
          try {
            const url = new URL(redirectedTo);
            const token = url.searchParams.get("token");
            if (token) {
              setToken(token);
              saveSettings({ baseUrl, token, endpoints });
              setStatus("Login successful ✓");
              return;
            }
          } catch (e) {
            setStatus("Login failed: Invalid redirect URL");
          }
        }
        setStatus("Login failed: No token received");
      },
    );
  }

  return (
    <div className="options-section">
      <div className="options-wrap">
        <div className="card">
          <h3>Connection</h3>
          <div className="label">Base URL</div>
          <input
            type="url"
            placeholder="https://your-domain"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            <button
              className="primary"
              disabled={!baseUrl || loginInProgress}
              onClick={handleLogin}
              style={{ marginRight: 8 }}
            >
              {loginInProgress ? "Logging in..." : "Login with Swush"}
            </button>
          </div>
          <div className="label" style={{ marginTop: 8 }}>
            API Token
          </div>
          <input
            type="text"
            placeholder="paste your token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        <div className="card">
          <h3>Endpoints (optional)</h3>
          <div className="grid2">
            <div>
              <div className="label">Bookmarks</div>
              <input
                value={endpoints.bookmarks}
                onChange={(e) =>
                  setEndpoints({ ...endpoints, bookmarks: e.target.value })
                }
              />
            </div>
            <div>
              <div className="label">Notes</div>
              <input
                value={endpoints.notes}
                onChange={(e) =>
                  setEndpoints({ ...endpoints, notes: e.target.value })
                }
              />
            </div>
            <div>
              <div className="label">Files</div>
              <input
                value={endpoints.files}
                onChange={(e) =>
                  setEndpoints({ ...endpoints, files: e.target.value })
                }
              />
            </div>
            <div>
              <div className="label">Shorten</div>
              <input
                value={endpoints.shorten}
                onChange={(e) =>
                  setEndpoints({ ...endpoints, shorten: e.target.value })
                }
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button className="primary" onClick={save}>
              Save
            </button>
          </div>
          <div className="status">{status}</div>
        </div>

        <div className="card credits">
          <h3>Made with 💜 by Iconical</h3>
          <p>Thanks for using Swush.</p>
          <div className="socials">
            <a href="https://x.com/imthatdevy" target="_blank" rel="noreferrer">
              X / @imthatdevy
            </a>
            <a href="https://iconical.dev" target="_blank" rel="noreferrer">
              iconical.dev
            </a>
            <a
              href="https://github.com/imthatdev"
              target="_blank"
              rel="noreferrer"
            >
              github.com/imthatdev
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
