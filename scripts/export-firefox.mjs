/*
 *   Copyright (c) 2026 Laith Alkhaddam aka Iconical.
 *   All rights reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const distDir = path.join(rootDir, "dist");
const extensionsDir = path.join(rootDir, "extensions");
const firefoxDir = path.join(extensionsDir, "firefox");
const manifestPath = path.join(firefoxDir, "manifest.json");

async function exists(filePath) {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const distManifestPath = path.join(distDir, "manifest.json");
  if (!(await exists(distManifestPath))) {
    throw new Error("Missing dist/manifest.json. Run npm run build first.");
  }

  await mkdir(extensionsDir, { recursive: true });
  await rm(firefoxDir, { recursive: true, force: true });
  await mkdir(firefoxDir, { recursive: true });
  await cp(distDir, firefoxDir, { recursive: true });

  const rawManifest = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(rawManifest);

  const backgroundScript =
    manifest.background?.service_worker || "service-worker-loader.js";
  manifest.background = {
    scripts: [backgroundScript],
    type: "module",
  };

  if (Array.isArray(manifest.web_accessible_resources)) {
    manifest.web_accessible_resources = manifest.web_accessible_resources.map(
      (entry) => {
        if (!entry || typeof entry !== "object") return entry;
        const { use_dynamic_url, ...rest } = entry;
        return rest;
      },
    );
  }

  manifest.browser_specific_settings = manifest.browser_specific_settings || {};
  manifest.browser_specific_settings.gecko = {
    ...(manifest.browser_specific_settings.gecko || {}),
    id: "swush-companion@iconical.dev",
    strict_min_version: "121.0",
    data_collection_permissions: {
      required: ["none"],
    },
  };

  await writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log("Firefox package generated in /extensions/firefox");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
