// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
  formatClock,
  formatShortDuration
} from '../format.js';
import {
  getIntentRecoveryTimeline
} from './intentRecoveryModel.js';

function getTimelineMarkerLabel(marker, getMessage) {
  const labels = {
    origin: 'popupIntentTimelineOriginLabel',
    firstDrift: 'popupIntentTimelineFirstDriftLabel',
    driftDescendant: 'popupIntentTimelineDriftDescendantLabel',
    current: 'popupIntentTimelineCurrentLabel'
  };
  return getMessage(labels[marker] || marker);
}

function getTimelineMetaParts(item = {}, getMessage) {
  const parts = [];
  if (item.skippedBefore > 0) {
    parts.push(getMessage('popupIntentTimelineSkippedSteps', [String(item.skippedBefore)]));
  }
  if (item.startedAt) {
    parts.push(formatClock(item.startedAt));
  }
  if (item.transitionType) {
    parts.push(item.transitionType);
  }
  if (Number.isFinite(Number(item.activeMs))) {
    parts.push(getMessage('popupIntentTimelineActiveDuration', [formatShortDuration(item.activeMs)]));
  }
  return parts;
}

function createTimelineItem(item = {}, getMessage) {
  const listItem = document.createElement('li');
  listItem.dataset.firstDrift = item.markers.includes('firstDrift') ? 'true' : 'false';
  listItem.dataset.current = item.markers.includes('current') ? 'true' : 'false';
  listItem.dataset.driftDescendant = item.markers.includes('driftDescendant') ? 'true' : 'false';

  const marker = document.createElement('span');
  marker.className = 'intent-recovery-timeline-marker';
  marker.textContent = String(item.index + 1);

  const body = document.createElement('div');
  body.className = 'intent-recovery-timeline-body';

  const title = document.createElement('strong');
  title.textContent = item.label;

  const meta = document.createElement('small');
  meta.textContent = getTimelineMetaParts(item, getMessage).join(' - ');

  const badges = document.createElement('div');
  badges.className = 'intent-recovery-timeline-badges';
  item.markers.forEach(markerName => {
    const badge = document.createElement('span');
    badge.textContent = getTimelineMarkerLabel(markerName, getMessage);
    badges.appendChild(badge);
  });

  body.append(title, meta, badges);
  listItem.append(marker, body);
  return listItem;
}

export function renderIntentRecoveryTimeline({
  timelineList,
  visits = [],
  firstDriftVisitId = null,
  getMessage
}) {
  if (!timelineList || typeof getMessage !== 'function') {
    return;
  }

  const items = getIntentRecoveryTimeline(visits, { firstDriftVisitId });
  timelineList.replaceChildren(...items.map(item => createTimelineItem(item, getMessage)));
}
