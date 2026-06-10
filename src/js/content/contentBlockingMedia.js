// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const contentBlocking = global.DAD.ContentBlocking = global.DAD.ContentBlocking || {};
  const { MEDIA_SUSPEND_INTERVAL_MS } = contentBlocking.constants;
  const suspendedMediaElements = new Set();
  const suspendedFrameElements = new Set();
  const mediaElementStates = new WeakMap();
  const frameElementStates = new WeakMap();
  let lastSuspendedAt = null;
  let lastRestoredAt = null;
  let lastRestoreSummary = null;

  function getAttributeState(element, attributeName) {
    return {
      hasAttribute: element.hasAttribute(attributeName),
      value: element.getAttribute(attributeName)
    };
  }

  function restoreAttributeState(element, attributeName, state) {
    if (!state?.hasAttribute) {
      element.removeAttribute(attributeName);
      return;
    }

    element.setAttribute(attributeName, state.value || '');
  }

  function captureMediaElementState(mediaElement) {
    if (mediaElementStates.has(mediaElement)) {
      return;
    }

    mediaElementStates.set(mediaElement, {
      wasPaused: mediaElement.paused,
      muted: mediaElement.muted,
      defaultMuted: mediaElement.defaultMuted,
      volume: mediaElement.volume,
      autoplay: mediaElement.autoplay,
      autoplayAttribute: getAttributeState(mediaElement, 'autoplay'),
      currentTime: Number.isFinite(mediaElement.currentTime) ? mediaElement.currentTime : null,
      playbackRate: Number.isFinite(mediaElement.playbackRate) ? mediaElement.playbackRate : null
    });
    suspendedMediaElements.add(mediaElement);
  }

  function captureFrameElementState(frameElement) {
    if (frameElementStates.has(frameElement)) {
      return;
    }

    frameElementStates.set(frameElement, {
      src: getAttributeState(frameElement, 'src'),
      srcdoc: getAttributeState(frameElement, 'srcdoc'),
      data: getAttributeState(frameElement, 'data'),
      sandbox: getAttributeState(frameElement, 'sandbox')
    });
    suspendedFrameElements.add(frameElement);
  }

  function suspendMediaElement(mediaElement) {
    captureMediaElementState(mediaElement);

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
  }

  function suspendEmbeddedFrame(frameElement) {
    captureFrameElementState(frameElement);

    if (frameElement.tagName.toLowerCase() === 'object') {
      frameElement.removeAttribute('data');
    }

    frameElement.removeAttribute('srcdoc');
    frameElement.removeAttribute('src');
    frameElement.setAttribute('sandbox', '');
  }

  function restoreMediaElement(mediaElement) {
    const state = mediaElementStates.get(mediaElement);
    if (!state) {
      return;
    }

    restoreAttributeState(mediaElement, 'autoplay', state.autoplayAttribute);
    mediaElement.autoplay = state.autoplay;
    mediaElement.defaultMuted = state.defaultMuted;
    mediaElement.muted = state.muted;
    mediaElement.volume = state.volume;

    if (state.playbackRate !== null) {
      try {
        mediaElement.playbackRate = state.playbackRate;
      } catch (error) {
        console.error('Failed to restore media playback rate:', error);
      }
    }

    if (state.currentTime !== null) {
      try {
        mediaElement.currentTime = state.currentTime;
      } catch (error) {
        // Live streams and some cross-origin media cannot seek back. Restoring
        // mute/volume state is more important than forcing a seek.
      }
    }

    if (!state.wasPaused) {
      try {
        const playResult = mediaElement.play();
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch(() => {});
        }
      } catch (error) {
        // Browser autoplay policy may require a user gesture after restoration.
      }
    }
  }

  function restoreEmbeddedFrame(frameElement) {
    const state = frameElementStates.get(frameElement);
    if (!state) {
      return;
    }

    restoreAttributeState(frameElement, 'sandbox', state.sandbox);
    restoreAttributeState(frameElement, 'data', state.data);
    restoreAttributeState(frameElement, 'srcdoc', state.srcdoc);
    restoreAttributeState(frameElement, 'src', state.src);
  }

  function suspendPageMedia() {
    document.querySelectorAll('audio, video').forEach(suspendMediaElement);
    document.querySelectorAll('iframe, embed, object').forEach(suspendEmbeddedFrame);
    lastSuspendedAt = new Date().toISOString();
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

  function restorePageMedia(reason = 'blockEnded') {
    let restoredMediaCount = 0;
    let restoredFrameCount = 0;

    suspendedMediaElements.forEach(mediaElement => {
      if (mediaElementStates.has(mediaElement)) {
        restoreMediaElement(mediaElement);
        mediaElementStates.delete(mediaElement);
        restoredMediaCount += 1;
      }
    });

    suspendedFrameElements.forEach(frameElement => {
      if (frameElementStates.has(frameElement)) {
        restoreEmbeddedFrame(frameElement);
        frameElementStates.delete(frameElement);
        restoredFrameCount += 1;
      }
    });

    suspendedMediaElements.clear();
    suspendedFrameElements.clear();
    lastRestoredAt = new Date().toISOString();
    lastRestoreSummary = {
      reason,
      restoredMediaCount,
      restoredFrameCount,
      restoredAt: lastRestoredAt
    };
  }

  function getMediaSuspensionDebugState() {
    return {
      suspensionIntervalActive: Boolean(global.blockedPageMediaInterval),
      suspendedMediaCount: suspendedMediaElements.size,
      suspendedFrameCount: suspendedFrameElements.size,
      currentMediaElementCount: document.querySelectorAll('audio, video').length,
      currentEmbeddedFrameCount: document.querySelectorAll('iframe, embed, object').length,
      lastSuspendedAt,
      lastRestoredAt,
      lastRestoreSummary
    };
  }

  contentBlocking.media = {
    getMediaSuspensionDebugState,
    keepPageMediaSuspended,
    restorePageMedia,
    suspendPageMedia
  };
})(window);
