# Decision Records

This file indexes durable project decisions for Defense against Distractions. Detailed specs stay in the linked documents; this index records the accepted direction so future work does not rediscover the same architectural choices.

## Active Decisions

### DR-001 Local-First Protection And Diagnostics

Status: accepted.

Decision: DaD stores configuration, runtime state, and bounded diagnostics in Chrome extension storage. Core blocking, Pomodoro, intent diagnostics, UI cleanup, and usage summaries do not require a remote server, analytics, telemetry, or remote executable code.

Evidence: [PRIVACY.md](../PRIVACY.md), [Storage Ownership](storage-ownership.md), [Release Readiness](release-readiness.md).

Consequence: any future remote network behavior must update the manifest, privacy policy, StorePilot answers, package verifier expectations, and release notes before release.

### DR-002 Plan-First Protection Model

Status: accepted.

Decision: user-facing protection is organized around plans rather than a flat website-only block list. Plans own schedules, entries, allowed websites, Pomodoro behavior, intent policy, UI element rules, and locked-schedule constraints.

Evidence: [Plans Architecture](plans-architecture.md), [Protection Model](protection-model.md), [Storage Ownership](storage-ownership.md).

Consequence: new protection features should attach to a plan or clearly explain why they are global settings.

### DR-003 Feature-First Extension Architecture

Status: accepted.

Decision: mature extension code should be grouped by feature or product responsibility, with runtime-surface splits inside that feature when needed. File type is not the primary organizing principle except at entry points, build boundaries, and manifest or CSP constraints.

Evidence: [Extension Modularization Playbook](extension-modularization-playbook.md), [Modularization Roadmap](modularization-roadmap.md), [Code Structure](code-structure.md).

Consequence: large follow-up work should move toward feature ownership maps and bounded modules instead of widening global folders.

### DR-004 StorePilot And Release Automation Are Source Artifacts

Status: accepted.

Decision: Chrome Web Store fields, privacy answers, category selection, listing text, screenshots, promo images, packaging, and release verification are maintained in the repository as source artifacts.

Evidence: [Release Readiness](release-readiness.md), [Chrome Web Store Privacy Form](chrome-web-store-privacy-form.md), [Chrome Web Store Additional Fields](chrome-web-store-additional-fields.md), [Chrome Web Store Category](chrome-web-store-category.md).

Consequence: release claims must be updated in docs and automated checks together, not only in the browser dashboard.

### DR-005 Bounded Intent Coherence Diagnostics

Status: accepted.

Decision: intent coherence is a local browsing-chain diagnostic system. It may score visible-page and navigation signals, show interventions, record bounded local feedback, and preserve recovery options, but it is not a clinical detector or a claim about the user's true intent.

Evidence: [Intent Coherence System](dad_intent_coherence_system.md), [Protection Model](protection-model.md), [Research Index](../research/README.md).

Consequence: copy, UI, and algorithms should describe observable drift and chain coherence, not hidden mental states.

### DR-006 UI Element Actions Stay Bounded And Non-Arbitrary

Status: accepted.

Decision: UI element blocking and triggered page actions should use bounded, user-configured operations such as hide, click, fill, wait, and optional page blocking. They should not become arbitrary injected JavaScript execution.

Evidence: [UI Element Blocking](ui-element-blocking.md), [Triggered Actions](triggered-actions.md), [Protection Model](protection-model.md).

Consequence: action design must prioritize preview, reversibility, host scoping, selector resilience, and clear user ownership.
