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
import {
  clearSettings,
  getSettings,
  saveSettings,
  type Settings,
} from "../lib/storage";
import { pollDeviceToken, startDeviceFlow } from "../lib/api";

type Tone = "muted" | "success" | "error";

export default function OptionsApp() {
  const [baseUrl, setBaseUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [enableEmbeddedButton, setEnableEmbeddedButton] = React.useState(false);
  const [smartUiAdaptation, setSmartUiAdaptation] = React.useState(true);
  const [floatingFallbackButton, setFloatingFallbackButton] =
    React.useState(true);
  const [autoDetectMedia, setAutoDetectMedia] = React.useState(true);
  const [status, setStatus] = React.useState<{ tone: Tone; message: string }>({
    tone: "muted",
    message: "",
  });
  const [flow, setFlow] = React.useState<{
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete: string;
    interval: number;
  } | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [polling, setPolling] = React.useState(false);
  const [manualKey, setManualKey] = React.useState("");
  const [isSavingUrl, setIsSavingUrl] = React.useState(false);
  const [isSavingManualKey, setIsSavingManualKey] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [isSavingBehavior, setIsSavingBehavior] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const s = await getSettings();
      setBaseUrl(s.baseUrl || "");
      setApiKey(s.apiKey || "");
      setManualKey(s.apiKey || "");
      setEnableEmbeddedButton(s.enableRemoteUploadEmbeddedButton === true);
      setSmartUiAdaptation(s.smartUiAdaptation !== false);
      setFloatingFallbackButton(s.floatingFallbackButton !== false);
      setAutoDetectMedia(s.autoDetectMedia !== false);
    })();
  }, []);

  const connected = Boolean(baseUrl && apiKey);

  const setMessage = (tone: Tone, message: string) =>
    setStatus({ tone, message });

  const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");

  async function startConnect() {
    const normalized = normalizeBaseUrl(baseUrl);
    if (!normalized) {
      setMessage("error", "Enter your Swush base URL first.");
      return;
    }

    setBaseUrl(normalized);
    setIsConnecting(true);
    setMessage("muted", "Creating device code...");
    try {
      const extensionId = chrome.runtime?.id || "swush-extension";
      const result = await startDeviceFlow(normalized, extensionId);
      setFlow({
        deviceCode: result.device_code,
        userCode: result.user_code,
        verificationUri: result.verification_uri,
        verificationUriComplete: result.verification_uri_complete,
        interval: result.interval || 5,
      });
      setMessage("success", "Device code created. Approve in Swush.");
      window.open(result.verification_uri_complete, "_blank");
      setPolling(true);
    } catch (e: any) {
      setMessage("error", e.message || "Failed to start device flow.");
    } finally {
      setIsConnecting(false);
    }
  }

  React.useEffect(() => {
    if (!flow || !polling) return;

    let timer: number | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        const result = await pollDeviceToken(
          normalizeBaseUrl(baseUrl),
          flow.deviceCode,
        );
        if (result.ok) {
          await saveSettings({
            baseUrl: normalizeBaseUrl(baseUrl),
            apiKey: result.data.api_key,
          });
          setApiKey(result.data.api_key);
          setManualKey(result.data.api_key);
          setFlow(null);
          setPolling(false);
          setMessage("success", "Connected! API key saved.");
          return;
        }

        if (
          result.error === "authorization_pending" ||
          result.error === "slow_down"
        ) {
          const nextInterval = (result.interval || flow.interval || 5) * 1000;
          timer = window.setTimeout(tick, nextInterval);
          return;
        }

        setPolling(false);
        setMessage("error", result.error_description || "Device flow failed.");
      } catch (e: any) {
        setPolling(false);
        setMessage("error", e.message || "Device flow failed.");
      }
    };

    timer = window.setTimeout(tick, flow.interval * 1000);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [flow, polling, baseUrl]);

  async function saveManualKey() {
    if (isSavingManualKey) return;
    setIsSavingManualKey(true);
    const normalized = normalizeBaseUrl(baseUrl);
    if (!normalized) {
      setMessage("error", "Enter your Swush base URL first.");
      setIsSavingManualKey(false);
      return;
    }
    if (!manualKey.trim()) {
      setMessage("error", "Paste your API key first.");
      setIsSavingManualKey(false);
      return;
    }
    await saveSettings({ baseUrl: normalized, apiKey: manualKey.trim() });
    setApiKey(manualKey.trim());
    setMessage("success", "API key saved.");
    setIsSavingManualKey(false);
  }

  async function saveBaseUrl() {
    if (isSavingUrl) return;
    setIsSavingUrl(true);
    const normalized = normalizeBaseUrl(baseUrl);
    if (!normalized) {
      setMessage("error", "Enter your Swush base URL first.");
      setIsSavingUrl(false);
      return;
    }
    await saveSettings({ baseUrl: normalized, apiKey });
    setBaseUrl(normalized);
    setMessage("success", "Base URL saved.");
    setIsSavingUrl(false);
  }

  async function disconnect() {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    await clearSettings();
    setApiKey("");
    setManualKey("");
    setEnableEmbeddedButton(true);
    setSmartUiAdaptation(true);
    setFloatingFallbackButton(true);
    setAutoDetectMedia(true);
    setFlow(null);
    setPolling(false);
    setMessage("muted", "Disconnected.");
    setIsDisconnecting(false);
  }

  async function saveBehaviorToggle(
    patch: Partial<Settings>,
    applyLocalState: () => void,
    message: string,
  ) {
    if (isSavingBehavior) return;
    setIsSavingBehavior(true);
    try {
      await saveSettings(patch);
      applyLocalState();
      setMessage("success", message);
    } catch (e: any) {
      setMessage("error", e?.message || "Failed to update behavior setting.");
    } finally {
      setIsSavingBehavior(false);
    }
  }

  return (
    <div className="options-shell">
      <header className="options-hero">
        <div>
          <div className="eyebrow">Swush Companion</div>
          <h1>Connect your workspace</h1>
          <p>
            Use the device flow to approve the extension and mint a fresh API
            key.
          </p>
        </div>
        <div className={`pill ${connected ? "pill-ok" : "pill-warn"}`}>
          {connected ? "Connected" : "Not connected"}
        </div>
      </header>

      <section className="card">
        <h2>Base URL</h2>
        <p>Point the extension at your Swush instance.</p>
        <label className="field">
          <span>Swush URL</span>
          <input
            type="url"
            placeholder="https://your-domain"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </label>
        <div className="inline actions">
          <button
            className="secondary"
            onClick={saveBaseUrl}
            disabled={isSavingUrl}
            aria-busy={isSavingUrl}
          >
            {isSavingUrl ? "Saving..." : "Save URL"}
          </button>
          <div className="helper">Required before connecting.</div>
        </div>
      </section>

      <section className="card">
        <h2>Device flow</h2>
        <p>Approve the extension in your Swush account.</p>
        {flow ? (
          <div className="stack">
            <div className="code-box">
              <div className="eyebrow">Enter this code</div>
              <div className="code">{flow.userCode}</div>
              <button
                className="secondary"
                onClick={() =>
                  window.open(flow.verificationUriComplete, "_blank")
                }
              >
                Open verification page
              </button>
            </div>
            <div className="helper">
              Waiting for approval. This expires in about 10 minutes.
            </div>
          </div>
        ) : (
          <div className="inline actions">
            <button
              className="primary"
              disabled={isConnecting || polling}
              aria-busy={isConnecting || polling}
              onClick={startConnect}
            >
              {isConnecting || polling ? "Waiting for approval..." : "Connect"}
            </button>
            <div className="helper">Opens Swush in a new tab.</div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>API key (manual)</h2>
        <p>Already have one? Paste it here.</p>
        <label className="field">
          <span>API key</span>
          <input
            type="text"
            placeholder="swush_..."
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
          />
        </label>
        <div className="inline actions">
          <button
            className="secondary"
            onClick={saveManualKey}
            disabled={isSavingManualKey}
            aria-busy={isSavingManualKey}
          >
            {isSavingManualKey ? "Saving..." : "Save key"}
          </button>
          {connected && (
            <button
              className="danger"
              onClick={disconnect}
              disabled={isDisconnecting}
              aria-busy={isDisconnecting}
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Embedded upload behavior</h2>
        <p>
          Master switch for on-page Upload to Swush buttons, plus behavior
          controls for styling and fallback logic.
        </p>
        <div className="stack">
          <div className="pref-row">
            <div>
              <div className="label">Enable remote upload embedded button</div>
              <div className="helper">
                {enableEmbeddedButton
                  ? "Enabled for popup-whitelisted domains."
                  : "Disabled."}
              </div>
            </div>
            <button
              type="button"
              className={`toggle ${enableEmbeddedButton ? "toggle-on" : ""}`}
              onClick={() =>
                void saveBehaviorToggle(
                  {
                    enableRemoteUploadEmbeddedButton: !enableEmbeddedButton,
                  },
                  () => setEnableEmbeddedButton((prev) => !prev),
                  !enableEmbeddedButton
                    ? "Embedded upload button enabled."
                    : "Embedded upload button disabled.",
                )
              }
              disabled={isSavingBehavior}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <div className="pref-row">
            <div>
              <div className="label">Smart UI adaptation</div>
              <div className="helper">Match native button styles per site.</div>
            </div>
            <button
              type="button"
              className={`toggle ${smartUiAdaptation ? "toggle-on" : ""}`}
              onClick={() =>
                void saveBehaviorToggle(
                  { smartUiAdaptation: !smartUiAdaptation },
                  () => setSmartUiAdaptation((prev) => !prev),
                  !smartUiAdaptation
                    ? "Smart UI adaptation enabled."
                    : "Smart UI adaptation disabled.",
                )
              }
              disabled={isSavingBehavior}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <div className="pref-row">
            <div>
              <div className="label">Auto-detect nearby media</div>
              <div className="helper">
                Prefer direct media URLs when available.
              </div>
            </div>
            <button
              type="button"
              className={`toggle ${autoDetectMedia ? "toggle-on" : ""}`}
              onClick={() =>
                void saveBehaviorToggle(
                  { autoDetectMedia: !autoDetectMedia },
                  () => setAutoDetectMedia((prev) => !prev),
                  !autoDetectMedia
                    ? "Auto media detection enabled."
                    : "Auto media detection disabled.",
                )
              }
              disabled={isSavingBehavior}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          <div className="pref-row">
            <div>
              <div className="label">Floating fallback button</div>
              <div className="helper">
                Show a floating action when inline placement is unavailable.
              </div>
            </div>
            <button
              type="button"
              className={`toggle ${floatingFallbackButton ? "toggle-on" : ""}`}
              onClick={() =>
                void saveBehaviorToggle(
                  { floatingFallbackButton: !floatingFallbackButton },
                  () => setFloatingFallbackButton((prev) => !prev),
                  !floatingFallbackButton
                    ? "Floating fallback enabled."
                    : "Floating fallback disabled.",
                )
              }
              disabled={isSavingBehavior}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>
      </section>

      <div className={`status status-${status.tone}`}>{status.message}</div>

      <section className="card credits">
        <h3>Made with 💜 by Iconical</h3>
        <p>Thanks for using Swush.</p>
        <div className="socials">
          <a
            href="https://iconical.dev/sponsor"
            target="_blank"
            rel="noreferrer"
          >
            Sponsor
          </a>
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
      </section>
    </div>
  );
}
