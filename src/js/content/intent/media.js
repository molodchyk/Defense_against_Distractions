// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};
  let intentMediaSuspended = false;

  function suspendIntentMedia() {
    const mediaApi = global.DAD.ContentBlocking?.media;
    if (!mediaApi?.suspendPageMedia) {
      return;
    }

    mediaApi.suspendPageMedia();
    intentMediaSuspended = true;
  }

  function restoreIntentMedia(reason = 'intentInterventionCleared') {
    if (!intentMediaSuspended || global.pageBlocked) {
      return;
    }

    global.DAD.ContentBlocking?.media?.restorePageMedia?.(reason);
    intentMediaSuspended = false;
  }

  intent.media = {
    restoreIntentMedia,
    suspendIntentMedia
  };
})(window);
