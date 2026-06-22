// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_PACKAGE_ROOT = 'dist/extension';
const DEFAULT_PROJECT_ROOT = '.';

const TEXT_EXTENSIONS = new Set(['.css', '.html', '.htm', '.js', '.mjs']);
const STATIC_RELATIVE_IMPORT_PATTERN = /\b(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;
const DYNAMIC_RELATIVE_IMPORT_PATTERN = /\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const FORBIDDEN_PACKAGE_PREFIXES = [
  '.git/',
  'docs/',
  'node_modules/',
  'research/',
  'scripts/',
  'test/',
  'store/',
  'assets/icons/extension-icon-source.svg'
];

const JS_REMOTE_EXECUTABLE_PATTERNS = [
  {
    label: 'remote static import',
    regex: /\bimport\s+(?:[^'"()]+?\s+from\s*)?["']https?:\/\//i
  },
  {
    label: 'remote dynamic import',
    regex: /\bimport\s*\(\s*["']https?:\/\//i
  },
  {
    label: 'remote importScripts call',
    regex: /\bimportScripts\s*\([^)]*["']https?:\/\//i
  },
  {
    label: 'remote worker script',
    regex: /\bnew\s+(?:Shared)?Worker\s*\(\s*["']https?:\/\//i
  },
  {
    label: 'remote WebAssembly streaming fetch',
    regex: /\bWebAssembly\.(?:compileStreaming|instantiateStreaming)\s*\(\s*fetch\s*\(\s*["']https?:\/\//i
  }
];

const HTML_REMOTE_EXECUTABLE_PATTERNS = [
  {
    label: 'remote script tag',
    regex: /<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//i
  },
  {
    label: 'remote module preload',
    regex: /<link\b[^>]*\brel\s*=\s*["'][^"']*\bmodulepreload\b[^"']*["'][^>]*\bhref\s*=\s*["']https?:\/\//i
  },
  {
    label: 'remote module preload',
    regex: /<link\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']+["'][^>]*\brel\s*=\s*["'][^"']*\bmodulepreload\b/i
  },
  {
    label: 'remote script preload',
    regex: /<link\b[^>]*\brel\s*=\s*["'][^"']*\bpreload\b[^"']*["'][^>]*\bas\s*=\s*["']script["'][^>]*\bhref\s*=\s*["']https?:\/\//i
  },
  {
    label: 'remote script preload',
    regex: /<link\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']+["'][^>]*\brel\s*=\s*["'][^"']*\bpreload\b[^"']*["'][^>]*\bas\s*=\s*["']script["']/i
  },
  {
    label: 'remote module import map entry',
    regex: /<script\b[^>]*\btype\s*=\s*["']importmap["'][^>]*>[\s\S]*["']https?:\/\//i
  }
];
const ALLOWED_FETCH_ARGUMENT_PATTERNS = [
  /^runtimeUrl\b/,
  /^localeUrl\b/,
  /^chrome\.runtime\.getURL\s*\(/,
  /^global\.chrome\.runtime\.getURL\s*\(/,
  /^globalThis\.chrome\.runtime\.getURL\s*\(/
];
const JS_REMOTE_NETWORK_PATTERNS = [
  {
    label: 'XMLHttpRequest usage',
    regex: /\bXMLHttpRequest\b/i
  },
  {
    label: 'sendBeacon usage',
    regex: /\b(?:navigator\.)?sendBeacon\s*\(/i
  },
  {
    label: 'WebSocket usage',
    regex: /\bnew\s+WebSocket\s*\(/i
  },
  {
    label: 'EventSource usage',
    regex: /\bnew\s+EventSource\s*\(/i
  }
];
const HTML_REMOTE_NETWORK_PATTERNS = [
  {
    label: 'remote image request',
    regex: /<img\b[^>]*\bsrc\s*=\s*["']https?:\/\//i
  },
  {
    label: 'remote iframe request',
    regex: /<iframe\b[^>]*\bsrc\s*=\s*["']https?:\/\//i
  },
  {
    label: 'remote stylesheet request',
    regex: /<link\b[^>]*\brel\s*=\s*["'][^"']*\bstylesheet\b[^"']*["'][^>]*\bhref\s*=\s*["']https?:\/\//i
  },
  {
    label: 'remote stylesheet request',
    regex: /<link\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']+["'][^>]*\brel\s*=\s*["'][^"']*\bstylesheet\b/i
  }
];
const CSS_REMOTE_NETWORK_PATTERNS = [
  {
    label: 'remote CSS import',
    regex: /@import\s+(?:url\(\s*)?["']?https?:\/\//i
  },
  {
    label: 'remote CSS URL',
    regex: /url\(\s*["']?https?:\/\//i
  }
];
const TRACKING_TELEMETRY_PATTERNS = [
  {
    label: 'Google Analytics API',
    regex: /\bgtag\s*\(/i
  },
  {
    label: 'Google Tag Manager data layer',
    regex: /\bdataLayer\s*\.\s*push\s*\(/i
  },
  {
    label: 'Google Analytics or Tag Manager endpoint',
    regex: /\b(?:google-analytics|googletagmanager)\.com\b/i
  },
  {
    label: 'Mixpanel SDK usage',
    regex: /\bmixpanel\s*\./i
  },
  {
    label: 'PostHog SDK usage',
    regex: /\bposthog\s*\./i
  },
  {
    label: 'Amplitude SDK usage',
    regex: /\bamplitude\s*\./i
  },
  {
    label: 'Segment endpoint or SDK usage',
    regex: /\b(?:segment\.io|analytics\.load\s*\(|analytics\.track\s*\()/i
  },
  {
    label: 'Plausible SDK usage',
    regex: /\bplausible\s*\(/i
  },
  {
    label: 'Matomo SDK usage',
    regex: /\b(?:_paq\s*\.\s*push\s*\(|Matomo\s*\.)/
  },
  {
    label: 'Sentry SDK usage',
    regex: /\b(?:Sentry\s*\.|@sentry\/|sentry\.io\b)/
  },
  {
    label: 'Heap SDK usage',
    regex: /\bheap\s*\.\s*(?:track|identify|load)\s*\(/i
  },
  {
    label: 'Meta Pixel API',
    regex: /\bfbq\s*\(/i
  }
];

function parseArgs(argv) {
  const options = {
    allowSourceMaps: false,
    packageRoot: DEFAULT_PACKAGE_ROOT,
    projectRoot: DEFAULT_PROJECT_ROOT
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--allow-source-maps') {
      options.allowSourceMaps = true;
      continue;
    }

    if (arg === '--package-root') {
      options.packageRoot = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--project-root') {
      options.projectRoot = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    ...options,
    packageRoot: path.resolve(options.packageRoot),
    projectRoot: path.resolve(options.projectRoot)
  };
}

function normalizeZipPath(value) {
  return value.replace(/\\/g, '/').replace(/^\/+/, '');
}

function normalizeRelativePath(root, value) {
  return normalizeZipPath(path.relative(root, value));
}

function isSubPath(parent, child) {
  const relativePath = path.relative(parent, child);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

async function exists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(absolutePath) {
  return JSON.parse(await readFile(absolutePath, 'utf8'));
}

async function walkFiles(rootDir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (entry.isFile()) {
        files.push(absolutePath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

function addPathReference(references, source, value, { allowGlob = false } = {}) {
  if (typeof value !== 'string' || value.length === 0) {
    return;
  }

  references.push({
    allowGlob,
    source,
    value: normalizeZipPath(value)
  });
}

function addIconMapReferences(references, source, iconMap) {
  if (!iconMap || typeof iconMap !== 'object') {
    return;
  }

  for (const [size, value] of Object.entries(iconMap)) {
    addPathReference(references, `${source}.${size}`, value);
  }
}

function collectManifestReferences(manifest) {
  const references = [];

  addPathReference(references, 'action.default_popup', manifest.action?.default_popup);
  addIconMapReferences(references, 'action.default_icon', manifest.action?.default_icon);
  addPathReference(references, 'options_page', manifest.options_page);
  addPathReference(references, 'options_ui.page', manifest.options_ui?.page);
  addPathReference(references, 'side_panel.default_path', manifest.side_panel?.default_path);
  addPathReference(references, 'devtools_page', manifest.devtools_page);
  addPathReference(references, 'background.service_worker', manifest.background?.service_worker);
  addIconMapReferences(references, 'icons', manifest.icons);

  for (const [overrideName, overridePath] of Object.entries(manifest.chrome_url_overrides || {})) {
    addPathReference(references, `chrome_url_overrides.${overrideName}`, overridePath);
  }

  for (const [scriptIndex, contentScript] of (manifest.content_scripts || []).entries()) {
    for (const scriptPath of contentScript.js || []) {
      addPathReference(references, `content_scripts[${scriptIndex}].js`, scriptPath);
    }

    for (const cssPath of contentScript.css || []) {
      addPathReference(references, `content_scripts[${scriptIndex}].css`, cssPath);
    }
  }

  for (const [resourceIndex, resourceGroup] of (manifest.web_accessible_resources || []).entries()) {
    for (const resourcePath of resourceGroup.resources || []) {
      addPathReference(references, `web_accessible_resources[${resourceIndex}].resources`, resourcePath, {
        allowGlob: true
      });
    }
  }

  return references;
}

function globToRegex(globPattern) {
  const escaped = normalizeZipPath(globPattern)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*');

  return new RegExp(`^${escaped}$`);
}

function assertManifestReferences({ entries, issues, manifest, packageRoot }) {
  const references = collectManifestReferences(manifest);

  for (const reference of references) {
    const referencePath = reference.value;
    const absoluteReferencePath = path.resolve(packageRoot, referencePath);

    if (!isSubPath(packageRoot, absoluteReferencePath)) {
      issues.push(`${reference.source} points outside the package: ${reference.value}`);
      continue;
    }

    if (reference.allowGlob && reference.value.includes('*')) {
      const regex = globToRegex(reference.value);
      const matches = entries.filter((entry) => regex.test(entry));

      if (matches.length === 0) {
        issues.push(`${reference.source} glob does not match any package file: ${reference.value}`);
      }

      continue;
    }

    if (!entries.includes(referencePath)) {
      issues.push(`${reference.source} is missing from package output: ${reference.value}`);
    }
  }

  return references.length;
}

function getManifestCspValues(manifest) {
  const policy = manifest.content_security_policy;

  if (typeof policy === 'string') {
    return [policy];
  }

  if (!policy || typeof policy !== 'object') {
    return [];
  }

  return Object.values(policy).filter((value) => typeof value === 'string');
}

function assertManifestPolicy({ issues, manifest }) {
  if (manifest.manifest_version !== 3) {
    issues.push(`Expected manifest_version 3, found ${manifest.manifest_version}`);
  }

  if (manifest.background?.service_worker && manifest.background.type !== 'module') {
    issues.push('Background service worker should declare "type": "module" in mature MV3 output.');
  }

  for (const csp of getManifestCspValues(manifest)) {
    if (/\bscript-src\b[^;]*(?:https?:\/\/|\*)/i.test(csp)) {
      issues.push('Manifest content_security_policy allows remote or wildcard script sources.');
    }
  }
}

function scanRemoteExecutableCode(relativePath, text) {
  const extension = path.extname(relativePath).toLowerCase();
  const patterns = [];

  if (extension === '.js' || extension === '.mjs') {
    patterns.push(...JS_REMOTE_EXECUTABLE_PATTERNS);
  }

  if (extension === '.html' || extension === '.htm') {
    patterns.push(...HTML_REMOTE_EXECUTABLE_PATTERNS);
  }

  return patterns
    .filter((pattern) => pattern.regex.test(text))
    .map((pattern) => `${relativePath}: ${pattern.label}`);
}

function summarizeCallArgument(value) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
}

function scanRemoteNetworkAccess(relativePath, text) {
  const extension = path.extname(relativePath).toLowerCase();
  const issues = [];

  if (extension === '.js' || extension === '.mjs') {
    for (const match of text.matchAll(/\bfetch\s*\(\s*([^)\r\n]+)/g)) {
      const argument = match[1].trim();
      const isAllowedLocalFetch = ALLOWED_FETCH_ARGUMENT_PATTERNS.some(pattern => pattern.test(argument));

      if (!isAllowedLocalFetch) {
        issues.push(`${relativePath}: unexpected fetch call (${summarizeCallArgument(argument)})`);
      }
    }

    for (const pattern of JS_REMOTE_NETWORK_PATTERNS) {
      if (pattern.regex.test(text)) {
        issues.push(`${relativePath}: ${pattern.label}`);
      }
    }
  }

  if (extension === '.html' || extension === '.htm') {
    for (const pattern of HTML_REMOTE_NETWORK_PATTERNS) {
      if (pattern.regex.test(text)) {
        issues.push(`${relativePath}: ${pattern.label}`);
      }
    }
  }

  if (extension === '.css') {
    for (const pattern of CSS_REMOTE_NETWORK_PATTERNS) {
      if (pattern.regex.test(text)) {
        issues.push(`${relativePath}: ${pattern.label}`);
      }
    }
  }

  return issues;
}

function scanTrackingTelemetryCode(relativePath, text) {
  return TRACKING_TELEMETRY_PATTERNS
    .filter((pattern) => pattern.regex.test(text))
    .map((pattern) => `${relativePath}: ${pattern.label}`);
}

function getRelativeImportSpecifiers(source) {
  return [
    ...source.matchAll(STATIC_RELATIVE_IMPORT_PATTERN),
    ...source.matchAll(DYNAMIC_RELATIVE_IMPORT_PATTERN)
  ].map((match) => match[1]);
}

function stripImportSuffix(specifier) {
  return specifier.split(/[?#]/, 1)[0];
}

async function assertPackageImportExists({ absolutePath, issues, packageRoot, specifier }) {
  const normalizedSpecifier = stripImportSuffix(specifier);
  const targetPath = path.resolve(path.dirname(absolutePath), normalizedSpecifier);
  const sourcePath = normalizeRelativePath(packageRoot, absolutePath);

  if (!isSubPath(packageRoot, targetPath)) {
    issues.push(`${sourcePath} imports outside the package output: ${specifier}`);
    return;
  }

  if (!await exists(targetPath)) {
    issues.push(`${sourcePath} imports a missing package file: ${specifier}`);
  }
}

async function assertPackageFiles({ allowSourceMaps, files, issues, packageRoot }) {
  for (const absolutePath of files) {
    const relativePath = normalizeRelativePath(packageRoot, absolutePath);
    const extension = path.extname(relativePath).toLowerCase();

    for (const forbiddenPrefix of FORBIDDEN_PACKAGE_PREFIXES) {
      if (relativePath.startsWith(forbiddenPrefix)) {
        issues.push(`Package output contains non-runtime path: ${relativePath}`);
      }
    }

    if (!allowSourceMaps && (extension === '.map' || relativePath.endsWith('.js.map') || relativePath.endsWith('.css.map'))) {
      issues.push(`Package output contains a source map without --allow-source-maps: ${relativePath}`);
    }

    if (!TEXT_EXTENSIONS.has(extension)) {
      continue;
    }

    const text = await readFile(absolutePath, 'utf8');

    if (!allowSourceMaps && /sourceMappingURL=/i.test(text)) {
      issues.push(`Package output references a source map without --allow-source-maps: ${relativePath}`);
    }

    for (const issue of scanRemoteExecutableCode(relativePath, text)) {
      issues.push(`Remote executable code detected: ${issue}`);
    }

    for (const issue of scanRemoteNetworkAccess(relativePath, text)) {
      issues.push(`Remote network access detected: ${issue}`);
    }

    for (const issue of scanTrackingTelemetryCode(relativePath, text)) {
      issues.push(`Tracking or telemetry code detected: ${issue}`);
    }

    if (extension === '.js' || extension === '.mjs') {
      for (const specifier of getRelativeImportSpecifiers(text)) {
        await assertPackageImportExists({
          absolutePath,
          issues,
          packageRoot,
          specifier
        });
      }
    }
  }
}

async function assertProjectConsistency({ issues, manifest, projectRoot }) {
  const rootManifestPath = path.join(projectRoot, 'manifest.json');
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (await exists(rootManifestPath)) {
    const rootManifest = await readJson(rootManifestPath);

    if (rootManifest.version !== manifest.version) {
      issues.push(`Package manifest version ${manifest.version} does not match project manifest version ${rootManifest.version}`);
    }

    if (rootManifest.name !== manifest.name) {
      issues.push(`Package manifest name "${manifest.name}" does not match project manifest name "${rootManifest.name}"`);
    }
  }

  if (await exists(packageJsonPath)) {
    const packageJson = await readJson(packageJsonPath);

    if (packageJson.version !== manifest.version) {
      issues.push(`Package manifest version ${manifest.version} does not match package.json version ${packageJson.version}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const packageRootStats = await stat(options.packageRoot).catch(() => null);

  if (!packageRootStats?.isDirectory()) {
    throw new Error(`Package output directory does not exist: ${options.packageRoot}`);
  }

  const manifestPath = path.join(options.packageRoot, 'manifest.json');
  const manifest = await readJson(manifestPath);
  const files = await walkFiles(options.packageRoot);
  const entries = files.map((filePath) => normalizeRelativePath(options.packageRoot, filePath));
  const issues = [];

  assertManifestPolicy({ issues, manifest });
  const referenceCount = assertManifestReferences({
    entries,
    issues,
    manifest,
    packageRoot: options.packageRoot
  });
  await assertPackageFiles({
    allowSourceMaps: options.allowSourceMaps,
    files,
    issues,
    packageRoot: options.packageRoot
  });
  await assertProjectConsistency({
    issues,
    manifest,
    projectRoot: options.projectRoot
  });

  if (issues.length > 0) {
    console.error('Package output check failed:');
    console.error('');

    for (const issue of issues) {
      console.error(`- ${issue}`);
    }

    process.exit(1);
  }

  console.log(`Package output check passed: ${entries.length} files scanned, ${referenceCount} manifest references verified.`);
}

main().catch((error) => {
  console.error(`Package output check failed: ${error.message}`);
  process.exit(1);
});
