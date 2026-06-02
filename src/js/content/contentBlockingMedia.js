// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const { MEDIA_SUSPEND_INTERVAL_MS } = contentBlocking.constants;

  function suspendMediaElement(mediaElement) {
    try {
      mediaElement.pause();
    } catch (error) {
      console.error('Failed to pause media element:', error);
    }

    mediaElement.muted = true;
    mediaElement.defaultMuted = true;
    mediaElement.volume = 0;
    mediaElement.autoplay = false;
    mediaElement.removeAttribute('autoplay');

    if (mediaElement.srcObject) {
      mediaElement.srcObject = null;
    }

    mediaElement.removeAttribute('src');
    mediaElement.querySelectorAll('source').forEach(source => {
      source.removeAttribute('src');
      source.removeAttribute('srcset');
    });

    try {
      mediaElement.load();
    } catch (error) {
      console.error('Failed to reset media element:', error);
    }
  }

  function suspendEmbeddedFrame(frameElement) {
    frameElement.removeAttribute('src');
    frameElement.removeAttribute('srcdoc');
    frameElement.setAttribute('sandbox', '');
  }

  function suspendPageMedia() {
    document.querySelectorAll('audio, video').forEach(suspendMediaElement);
    document.querySelectorAll('iframe, embed, object').forEach(suspendEmbeddedFrame);
  }

  function keepPageMediaSuspended() {
    suspendPageMedia();

    if (global.blockedPageMediaInterval) {
      return;
    }

    global.blockedPageMediaInterval = global.setInterval(() => {
      if (global.pageBlocked) {
        suspendPageMedia();
      }
    }, MEDIA_SUSPEND_INTERVAL_MS);
  }

  contentBlocking.media = {
    keepPageMediaSuspended,
    suspendPageMedia
  };
})(window);
