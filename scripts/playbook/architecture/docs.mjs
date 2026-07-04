// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { hasAll } from '../../playbook-utils.mjs';

export function getArchitectureDocumentationFailures({ architectureResearch, codeStructure, modularizationPlaybook, modularizationRoadmap }) {
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
    /Feature Public API Rule/,
    /Each feature should expose an intentional public API/i,
    /features\/feature-name\/index\.js` exports the stable cross-feature API/,
    /Surface-specific APIs may use `features\/feature-name\/popup\/index\.js`, `options\/index\.js`, `content\/index\.js`, or `background\/index\.js`/,
    /Other features should not deep-import another feature's `core`, `ui`, `popup`, `options`, `content`, or `background` internals unless a migration note names the reason/i,
    /Shared primitives that many features need should move to `shared` or `platform`/i,
    /Without it, a feature-first tree can decay into a better-looking version of the old file-type split/i,
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
    /Do not add a bundler just to make the tree look modern/,
    /Current Next Engineering Steps/,
    /file-size and folder-density audits, manifest reference checks, relative import checks, platform-boundary checks, package-output checks, and release verification all run through the current scripts/i,
    /Keep the browser-load smoke check outside automated release\/package gates/i,
    /future bundler or TypeScript migration as a product-risk decision/i
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

  const modularizationRoadmapOk = hasAll(modularizationRoadmap, [
    /# DaD Modularization Roadmap/,
    /project-specific migration plan/i,
    /does not replace the reusable playbook as the architecture standard/i,
    /transitional paths under `src\/js`, classic content-script globals, or compatibility barrels/i,
    /current migration inventory and delivery constraints/i,
    /do not override the playbook's feature-first ES-module source target/i
  ]);

  if (modularizationPlaybookOk && architectureResearchOk && codeStructureOk && modularizationRoadmapOk) {
    return [];
  }

  return ['Architecture documentation must preserve the feature-first, ES-module, generated-output modularization target and distinguish it from DaD migration inventory.'];
}
