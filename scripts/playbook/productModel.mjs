// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { hasAll } from '../playbook-utils.mjs';

export function getProductModelFailures({ protectionModel }) {
  const failures = [];

  if (!hasAll(protectionModel, [
    /Product telemetry is not part of the default direction/i,
    /should not add analytics, tracking, remote feedback uploads, or remote network behavior/i,
    /ordinary protection work/i,
    /future release deliberately adds remote feedback or telemetry/i,
    /opt-in/i,
    /manifest, privacy policy, StorePilot privacy answers, package verifier expectations, release notes, and store listing copy/i
  ])) {
    failures.push('Protection model must keep the current no-telemetry default and require any future remote feedback or telemetry to be opt-in and reflected across release/privacy/store surfaces.');
  }

  return failures;
}
