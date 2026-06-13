// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  let mediaPlaybackMs = 0;
  let mediaPlaybackStartedAt = null;
  let mediaPlayEvents = 0;
  let mediaPauseEvents = 0;
  let mediaEndEvents = 0;
  let mediaSourceChangeEvents = 0;
  let mediaSources = new WeakMap();
  const activeMediaElements = new Set();

  function isPageVisible() {
    return global.document.visibilityState !== 'hidden';
  }

  function isMediaElement(element) {
    const tagName = String(element?.tagName || '').toLowerCase();
    return tagName === 'video' || tagName === 'audio';
  }

  function isMediaCurrentlyPlaying(element) {
    return isMediaElement(element) && element.paused === false && element.ended !== true;
  }

  function getMediaSourceSignature(element) {
    return String(element?.currentSrc || element?.src || element?.getAttribute?.('src') || '').trim();
  }

  function rememberMediaSource(element) {
    const nextSource = getMediaSourceSignature(element);
    if (!nextSource) {
      return false;
    }

    const previousSource = mediaSources.get(element);
    mediaSources.set(element, nextSource);
    if (!previousSource || previousSource === nextSource) {
      return false;
    }

    mediaSourceChangeEvents += 1;
    return true;
  }

  function refreshMediaPlaybackTime(nextHasActiveMedia = activeMediaElements.size > 0) {
    const now = Date.now();
    if (mediaPlaybackStartedAt !== null) {
      mediaPlaybackMs += Math.max(0, now - mediaPlaybackStartedAt);
    }

    mediaPlaybackStartedAt = nextHasActiveMedia && isPageVisible() ? now : null;
  }

  function getMediaPlaybackMs() {
    const currentPlaybackMs = mediaPlaybackStartedAt !== null && isPageVisible()
      ? Date.now() - mediaPlaybackStartedAt
      : 0;
    return Math.max(0, mediaPlaybackMs + currentPlaybackMs);
  }

  function seedMediaActivity() {
    activeMediaElements.clear();
    mediaSources = new WeakMap();
    Array.from(global.document.querySelectorAll?.('video, audio') || []).forEach(mediaElement => {
      const source = getMediaSourceSignature(mediaElement);
      if (source) {
        mediaSources.set(mediaElement, source);
      }
      if (isMediaCurrentlyPlaying(mediaElement)) {
        activeMediaElements.add(mediaElement);
      }
    });
    mediaPlaybackStartedAt = activeMediaElements.size > 0 && isPageVisible() ? Date.now() : null;
  }

  function updateMediaPlaybackTime() {
    refreshMediaPlaybackTime();
  }

  function getMediaActivitySignals() {
    return {
      mediaPlaybackMs: Math.round(getMediaPlaybackMs()),
      mediaPlayEvents,
      mediaPauseEvents,
      mediaEndEvents,
      mediaSourceChangeEvents
    };
  }

  function resetMediaActivity() {
    mediaPlaybackMs = 0;
    mediaPlaybackStartedAt = null;
    mediaPlayEvents = 0;
    mediaPauseEvents = 0;
    mediaEndEvents = 0;
    mediaSourceChangeEvents = 0;
    seedMediaActivity();
  }

  function installMediaActivityListeners(schedulePageSignalReport) {
    global.document.addEventListener('play', event => {
      const mediaElement = event.target;
      if (!isMediaElement(mediaElement)) {
        return;
      }

      const sourceChanged = rememberMediaSource(mediaElement);
      if (activeMediaElements.has(mediaElement)) {
        if (sourceChanged) {
          schedulePageSignalReport();
        }
        return;
      }

      refreshMediaPlaybackTime(true);
      activeMediaElements.add(mediaElement);
      mediaPlayEvents += 1;
      schedulePageSignalReport();
    }, true);

    const recordMediaSourceChange = event => {
      if (isMediaElement(event.target) && rememberMediaSource(event.target)) {
        schedulePageSignalReport();
      }
    };

    const recordMediaStop = event => {
      const mediaElement = event.target;
      if (!isMediaElement(mediaElement) || !activeMediaElements.has(mediaElement)) {
        return;
      }

      refreshMediaPlaybackTime(activeMediaElements.size > 1);
      activeMediaElements.delete(mediaElement);
      mediaPauseEvents += 1;
      if (event.type === 'ended') {
        mediaEndEvents += 1;
      }
      schedulePageSignalReport();
    };

    global.document.addEventListener('loadedmetadata', recordMediaSourceChange, true);
    global.document.addEventListener('durationchange', recordMediaSourceChange, true);
    global.document.addEventListener('pause', recordMediaStop, true);
    global.document.addEventListener('ended', recordMediaStop, true);
  }

  global.DAD.PageSignalMediaActivity = {
    getMediaActivitySignals,
    installMediaActivityListeners,
    resetMediaActivity,
    updateMediaPlaybackTime
  };
})(window);
