// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { getArchitectureDocumentationFailures } from '../../../scripts/playbook/architecture/docs.mjs';

async function readDocs() {
  const [architectureResearch, codeStructure, modularizationPlaybook] = await Promise.all([
    readFile('docs/extension-architecture-research.md', 'utf8'),
    readFile('docs/code-structure.md', 'utf8'),
    readFile('docs/extension-modularization-playbook.md', 'utf8')
  ]);

  return { architectureResearch, codeStructure, modularizationPlaybook };
}

describe('architecture documentation checks', () => {
  it('accepts the current feature-first modularization target', async () => {
    const docs = await readDocs();

    assert.deepEqual(getArchitectureDocumentationFailures(docs), []);
  });

  it('rejects modularization guidance that loses the file-type anti-pattern guard', async () => {
    const docs = await readDocs();
    const weakenedPlaybook = docs.modularizationPlaybook.replace(
      'Do not organize a mature extension primarily by file type.',
      'Organize a mature extension primarily by file type.'
    );

    assert.deepEqual(getArchitectureDocumentationFailures({
      ...docs,
      modularizationPlaybook: weakenedPlaybook
    }), [
      'Architecture documentation must preserve the feature-first, ES-module, generated-output modularization target and distinguish it from DaD migration inventory.'
    ]);
  });
});
