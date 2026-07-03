// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { hasAll } from '../../playbook-utils.mjs';

export function getArchitectureDocumentationFailures({ architectureResearch, codeStructure, modularizationPlaybook }) {
  const modularizationPlaybookOk = hasAll(modularizationPlaybook, [
    /# Extension Modularization Playbook/,
    /prescriptive target/i,
    /architecture standard/i,
    /Use feature-first modules with thin runtime entry points/,
    /Do not organize a mature extension primarily by file type/,
    /File-type folders are build artifacts or runtime-entry surfaces only/,
    /Author source as ES modules by default/,
    /generated output handles the browser contract/,
    /use generated output to satisfy manifest, CSP, or browser-extension loading rules/,
    /Avoid dynamic import in MV3 extension service workers/,
    /TypeScript is the preferred default/,
    /Feature Ownership Rules/,
    /Co-Location Rule/,
    /Compatibility Barrels/,
    /Codex Operating Protocol/,
    /New UI behavior: feature-owned/
  ]);

  const architectureResearchOk = hasAll(architectureResearch, [
    /# Extension Architecture Research/,
    /official Chrome extension \/ Chrome Web Store documentation/i,
    /Background Code Must Be Termination-Safe/,
    /Use ES Modules Where Chrome Supports Them; Do Not Assume Dynamic Imports/,
    /Content Scripts Are A Separate Trust And Module Boundary/,
    /Treat Messages From Content Scripts As Untrusted/,
    /Storage Must Be Split By Criticality And Sync Cost/,
    /Permissions Must Be Narrow, Current, And Explainable/,
    /No Remote Hosted Code/,
    /Testing Needs A Browser Layer, Not Only Unit Tests/,
    /Do not add a bundler just to make the tree look modern/
  ]);

  const codeStructureOk = hasAll(codeStructure, [
    /reusable cross-extension version lives in \[Extension Modularization Playbook\]/,
    /external Chrome extension architecture constraints/i,
    /The root `src\/js` folder should stay empty of runtime entries and helper modules/,
    /compatibility barrel/i,
    /narrowest matching/i,
    /Future popup work should go into the narrowest matching popup module/,
    /Future options styling should go into the narrowest matching CSS module/
  ]);

  if (modularizationPlaybookOk && architectureResearchOk && codeStructureOk) {
    return [];
  }

  return ['Architecture documentation must preserve the feature-first, ES-module, generated-output modularization target and distinguish it from DaD migration inventory.'];
}
