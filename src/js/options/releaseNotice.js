// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync, setSync } from '../shared/storage/chromeStorage.js';
import {
  RELEASE_BACKUP_NOTICE_ELIGIBLE_KEY,
  RELEASE_BACKUP_NOTICE_SEEN_KEY
} from '../shared/releaseBackupNotice.js';
import { exportSettings } from './storageTransfer.js';

async function markNoticeSeen() {
  await setSync({ [RELEASE_BACKUP_NOTICE_SEEN_KEY]: true });
}

function closeNotice(overlay) {
  overlay.remove();
}

function createReleaseNotice() {
  const overlay = document.createElement('div');
  overlay.className = 'release-notice-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'releaseNoticeTitle');

  const dialog = document.createElement('section');
  dialog.className = 'release-notice-dialog';

  const title = document.createElement('h2');
  title.id = 'releaseNoticeTitle';
  title.textContent = 'Save your DaD configuration';

  const body = document.createElement('p');
  body.textContent = 'Major updates may be coming soon. Before updating further, it is best to export and save your current Defense Against Distractions configuration.';

  const actions = document.createElement('div');
  actions.className = 'release-notice-actions';

  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.className = 'release-notice-primary';
  exportButton.textContent = 'Export settings';
  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    try {
      await exportSettings();
      await markNoticeSeen();
      closeNotice(overlay);
    } catch (error) {
      console.error('Could not export settings from release notice:', error);
      exportButton.disabled = false;
    }
  });

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'release-notice-secondary';
  dismissButton.textContent = 'I saved it';
  dismissButton.addEventListener('click', async () => {
    await markNoticeSeen();
    closeNotice(overlay);
  });

  actions.appendChild(exportButton);
  actions.appendChild(dismissButton);
  dialog.appendChild(title);
  dialog.appendChild(body);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);
  return overlay;
}

export async function initializeReleaseBackupNotice() {
  try {
    const items = await getSync(null);
    if (items[RELEASE_BACKUP_NOTICE_SEEN_KEY] || !items[RELEASE_BACKUP_NOTICE_ELIGIBLE_KEY]) {
      return;
    }

    document.body.appendChild(createReleaseNotice());
  } catch (error) {
    console.error('Failed to initialize release backup notice:', error);
  }
}
