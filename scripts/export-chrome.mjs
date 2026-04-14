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

import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const distDir = path.join(rootDir, "dist");
const extensionsDir = path.join(rootDir, "extensions");
const chromeDir = path.join(extensionsDir, "chrome");

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
  await rm(chromeDir, { recursive: true, force: true });
  await mkdir(chromeDir, { recursive: true });
  await cp(distDir, chromeDir, { recursive: true });

  console.log("Chrome package generated in /extensions/chrome");
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
