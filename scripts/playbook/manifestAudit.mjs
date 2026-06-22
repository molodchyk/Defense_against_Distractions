// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

function getDocumentedContentScripts(contentScriptLoadOrderDoc) {
  const marker = '## Ordered Scripts';
  const start = contentScriptLoadOrderDoc.indexOf(marker);
  if (start === -1) {
    return [];
  }

  const afterMarker = contentScriptLoadOrderDoc.slice(start + marker.length);
  const nextHeading = afterMarker.search(/\n##\s/);
  const section = nextHeading === -1 ? afterMarker : afterMarker.slice(0, nextHeading);

  return [...section.matchAll(/^- `([^`]+\.js)`$/gm)].map(match => match[1]);
}

function sameOrderedList(left, right) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function getManifestAuditFailures({ manifest, contentScriptLoadOrderDoc }) {
  const failures = [];
  const contentScripts = manifest.content_scripts?.[0]?.js || [];
  const documentedContentScripts = getDocumentedContentScripts(contentScriptLoadOrderDoc);

  if (!/classic content-script order in `manifest\.json`/.test(contentScriptLoadOrderDoc)) {
    failures.push('Content-script load order doc must state that it audits the manifest content-script order.');
  }
  if (!/`window\.DAD` compatibility namespace/.test(contentScriptLoadOrderDoc)) {
    failures.push('Content-script load order doc must document the window.DAD compatibility namespace.');
  }
  if (!/Preserve this order when moving content-script files/.test(contentScriptLoadOrderDoc)) {
    failures.push('Content-script load order doc must state the preservation rule for path moves.');
  }
  if (!sameOrderedList(documentedContentScripts, contentScripts)) {
    failures.push('Content-script load order doc must exactly match manifest.json content_scripts[0].js order.');
  }
  if (contentScripts[0] !== 'src/platform/chrome/contentBridge.js') {
    failures.push('Manifest content scripts must load the Chrome content bridge first.');
  }
  if (contentScripts.at(-1) !== 'src/app/content/index.js') {
    failures.push('Manifest content scripts must load the content app bootstrap last.');
  }

  return failures;
}
