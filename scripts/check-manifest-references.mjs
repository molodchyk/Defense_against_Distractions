// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, 'manifest.json');

function addPath(references, source, value) {
  if (typeof value !== 'string' || value.length === 0) {
    return;
  }

  if (value.includes('*')) {
    return;
  }

  references.push({ source, value });
}

function addIconMap(references, source, iconMap) {
  if (!iconMap || typeof iconMap !== 'object') {
    return;
  }

  for (const [size, value] of Object.entries(iconMap)) {
    addPath(references, `${source}.${size}`, value);
  }
}

async function exists(relativePath) {
  try {
    await access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const references = [];

addPath(references, 'action.default_popup', manifest.action?.default_popup);
addIconMap(references, 'action.default_icon', manifest.action?.default_icon);
addPath(references, 'options_page', manifest.options_page);
addPath(references, 'background.service_worker', manifest.background?.service_worker);
addIconMap(references, 'icons', manifest.icons);

for (const [scriptIndex, contentScript] of (manifest.content_scripts || []).entries()) {
  for (const scriptPath of contentScript.js || []) {
    addPath(references, `content_scripts[${scriptIndex}].js`, scriptPath);
  }
  for (const cssPath of contentScript.css || []) {
    addPath(references, `content_scripts[${scriptIndex}].css`, cssPath);
  }
}

for (const [resourceIndex, resourceGroup] of (manifest.web_accessible_resources || []).entries()) {
  for (const resourcePath of resourceGroup.resources || []) {
    addPath(references, `web_accessible_resources[${resourceIndex}].resources`, resourcePath);
  }
}

const missing = [];

for (const reference of references) {
  if (!await exists(reference.value)) {
    missing.push(reference);
  }
}

if (missing.length === 0) {
  console.log(`Manifest reference check passed: ${references.length} referenced files exist.`);
  process.exit(0);
}

console.error('Manifest reference check failed: missing referenced files.');
console.error('');

for (const reference of missing) {
  console.error(`- ${reference.source}: ${reference.value}`);
}

process.exit(1);
