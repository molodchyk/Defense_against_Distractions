// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const ACTIVITY_PATH = 'src/js/content/page-signals/activity.js';
const ACTIVITY_INPUT_PATH = 'src/js/content/page-signals/activityInput.js';
const ACTIVITY_MEDIA_PATH = 'src/js/content/page-signals/activityMedia.js';
const ACTIVITY_SCROLL_PATH = 'src/js/content/page-signals/activityScroll.js';
const CONTEXT_TOKENS_PATH = 'src/js/content/page-signals/contextTokens.js';
const RECOMMENDER_ZONES_PATH = 'src/js/content/page-signals/recommenderZones.js';

function loadActivityScript({ hostname = 'docs.example.com', mediaElements = [] } = {}) {
  let now = 1000;
  const documentListeners = new Map();
  const windowListeners = new Map();
  const document = {
    visibilityState: 'visible',
    activeElement: null,
    documentElement: {
      clientHeight: 100,
      scrollHeight: 1000
    },
    body: {
      scrollHeight: 1000
    },
    location: {
      hostname
    },
    addEventListener(eventName, handler) {
      documentListeners.set(eventName, handler);
    },
    getSelection() {
      return {
        isCollapsed: !document.selectionText,
        toString: () => document.selectionText || ''
      };
    },
    querySelectorAll(selector) {
      return selector === 'video, audio' ? mediaElements : [];
    },
    selectionText: ''
  };
  const window = {
    DAD: {},
    Date: {
      now: () => now
    },
    Node: {
      ELEMENT_NODE: 1
    },
    document,
    innerHeight: 100,
    location: {
      hostname
    },
    scrollY: 0,
    addEventListener(eventName, handler) {
      windowListeners.set(eventName, handler);
    }
  };
  window.window = window;
  vm.createContext(window);
  vm.runInContext(readFileSync(CONTEXT_TOKENS_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(RECOMMENDER_ZONES_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(ACTIVITY_SCROLL_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(ACTIVITY_INPUT_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(ACTIVITY_MEDIA_PATH, 'utf8'), window);
  vm.runInContext(readFileSync(ACTIVITY_PATH, 'utf8'), window);
  return {
    activity: window.DAD.PageSignalsActivity,
    document,
    documentListeners,
    setSelectionText(value) {
      document.selectionText = value;
    },
    setNow(value) {
      now = value;
    },
    setScrollY(value) {
      window.scrollY = value;
      document.documentElement.scrollTop = value;
      document.body.scrollTop = value;
    },
    windowListeners
  };
}

function createFakeElement({ tagName = 'DIV', attrs = {}, children = [], text = '' } = {}) {
  const normalizedTagName = String(tagName).toUpperCase();
  const element = {
    nodeType: 1,
    tagName: normalizedTagName,
    innerText: text,
    textContent: text,
    parentElement: null,
    children,
    closest(selector) {
      let current = element;
      while (current) {
        if (current.matches(selector)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    },
    contains(target) {
      return target === element || children.some(child => child.contains?.(target));
    },
    getAttribute(name) {
      return attrs[name] || '';
    },
    matches(selector) {
      return selector.split(',').map(part => part.trim()).some(part => {
        if (part === 'a[href]') {
          return normalizedTagName === 'A' && Boolean(attrs.href);
        }
        if (part === 'button') {
          return normalizedTagName === 'BUTTON';
        }
        if (part === '[role="button"]') {
          return attrs.role === 'button';
        }
        if (part === '[role="link"]') {
          return attrs.role === 'link';
        }
        if (['img', 'picture', 'video', 'canvas', 'svg'].includes(part)) {
          return normalizedTagName === part.toUpperCase();
        }
        return false;
      });
    },
    querySelector(selector) {
      for (const child of children) {
        if (child.matches?.(selector)) {
          return child;
        }
        const descendant = child.querySelector?.(selector);
        if (descendant) {
          return descendant;
        }
      }
      return null;
    }
  };

  children.forEach(child => {
    child.parentElement = element;
  });
  return element;
}

describe('content page-signal activity tracking', () => {
  it('tracks bounded visible media playback time from play and pause events', () => {
    const video = { tagName: 'VIDEO', paused: true, ended: false, currentSrc: 'clip-one.mp4' };
    const { activity, documentListeners, setNow } = loadActivityScript();

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});

    video.paused = false;
    documentListeners.get('play')({ target: video });
    setNow(31 * 1000);
    video.currentSrc = 'clip-two.mp4';
    documentListeners.get('loadedmetadata')({ target: video });
    setNow(91 * 1000);
    video.paused = true;
    documentListeners.get('pause')({ target: video });
    setNow(121 * 1000);

    const signals = activity.getActivitySignals();

    assert.equal(signals.mediaPlaybackMs, 90000);
    assert.equal(signals.mediaPlayEvents, 1);
    assert.equal(signals.mediaPauseEvents, 1);
    assert.equal(signals.mediaSourceChangeEvents, 1);
  });

  it('seeds already-playing media without recording a new play event', () => {
    const video = { tagName: 'VIDEO', paused: false, ended: false };
    const { activity, setNow } = loadActivityScript({ mediaElements: [video] });

    activity.resetActivitySignals();
    setNow(61 * 1000);

    const signals = activity.getActivitySignals();

    assert.equal(signals.mediaPlaybackMs, 60000);
    assert.equal(signals.mediaPlayEvents, 0);
  });

  it('does not count hidden-page media time as visible passive playback', () => {
    const audio = { tagName: 'AUDIO', paused: true, ended: false };
    const { activity, document, documentListeners, setNow } = loadActivityScript();

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});

    audio.paused = false;
    documentListeners.get('play')({ target: audio });
    setNow(31 * 1000);
    document.visibilityState = 'hidden';
    activity.updateActivePageTime();
    setNow(91 * 1000);

    assert.equal(activity.getActivitySignals().mediaPlaybackMs, 30000);
  });

  it('keeps only bounded clicked-link and selected-text tokens from click context', () => {
    const { activity, setSelectionText, windowListeners } = loadActivityScript();
    const anchor = {
      nodeType: 1,
      tagName: 'A',
      innerText: 'PDE5 inhibitor mechanism reference',
      textContent: '',
      parentElement: null,
      closest(selector) {
        return selector === 'a[href]' ? anchor : null;
      },
      getAttribute(name) {
        return name === 'href' ? '/pde5' : '';
      },
      matches() {
        return false;
      }
    };

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});
    setSelectionText('sildenafil dosage trial evidence');
    windowListeners.get('click')({ target: anchor });

    const signals = activity.getActivitySignals();

    assert.deepEqual([...signals.clickedLinkTokens], ['pde5', 'inhibitor', 'mechanism', 'reference']);
    assert.deepEqual([...signals.selectedTextTokens], ['sildenafil', 'dosage', 'trial', 'evidence']);
  });

  it('tracks bounded scroll direction changes as scroll loop pressure', () => {
    const { activity, setScrollY, windowListeners } = loadActivityScript();

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});

    [120, 260, 180, 90, 140].forEach(value => {
      setScrollY(value);
      windowListeners.get('scroll')({});
    });

    const signals = activity.getActivitySignals();

    assert.equal(signals.scrollEvents, 5);
    assert.equal(signals.scrollDirectionChanges, 2);
    assert.equal(signals.scrollDistanceViewportUnits, 4.8);
  });

  it('tracks dynamic content appended shortly after scrolling', () => {
    const { activity, setNow, setScrollY, windowListeners } = loadActivityScript();
    const addedNode = {
      nodeType: 1,
      querySelectorAll(selector) {
        return selector === '*' ? Array.from({ length: 4 }) : [];
      }
    };

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});
    activity.recordDomMutationBatch([{ addedNodes: [addedNode] }]);

    setScrollY(140);
    windowListeners.get('scroll')({});
    activity.recordDomMutationBatch([{ addedNodes: [addedNode] }]);
    setNow(5000);
    activity.recordDomMutationBatch([{ addedNodes: [addedNode] }]);

    const signals = activity.getActivitySignals();

    assert.equal(signals.dynamicContentBatches, 3);
    assert.equal(signals.dynamicAddedElements, 15);
    assert.equal(signals.scrollLinkedContentBatches, 1);
    assert.equal(signals.scrollLinkedAddedElements, 5);
  });

  it('tracks focused editable time without storing input values', () => {
    const { activity, document, documentListeners, setNow, windowListeners } = loadActivityScript();
    const textarea = createFakeElement({ tagName: 'TEXTAREA' });

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});

    document.activeElement = textarea;
    documentListeners.get('focusin')({ target: textarea });
    setNow(31 * 1000);
    windowListeners.get('keydown')({ target: textarea });
    windowListeners.get('input')({ target: textarea });
    setNow(61 * 1000);
    documentListeners.get('focusout')({ target: textarea });

    const signals = activity.getActivitySignals();
    assert.equal(signals.activeInputMs, 60000);
    assert.equal(signals.keyEvents, 1);
    assert.equal(signals.inputEvents, 1);
    assert.equal('inputValue' in signals, false);
  });

  it('counts site-specific recommendation zone clicks', () => {
    const { activity, windowListeners } = loadActivityScript({ hostname: 'www.youtube.com' });
    const relatedZone = {
      nodeType: 1,
      tagName: 'YTD-COMPACT-VIDEO-RENDERER',
      innerText: 'Recommended reaction clip',
      textContent: '',
      parentElement: null,
      closest() {
        return null;
      },
      getAttribute() {
        return '';
      },
      matches(selector) {
        return selector.includes('ytd-compact-video-renderer');
      }
    };

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});
    windowListeners.get('click')({ target: relatedZone });

    const signals = activity.getActivitySignals();

    assert.equal(signals.recommenderClickEvents, 1);
    assert.equal(signals.recommendationClickEvents, 1);
    assert.equal(signals.feedClickEvents, 0);
    assert.equal(signals.commentClickEvents, 0);
  });

  it('counts generic feed zone clicks separately from recommendation clicks', () => {
    const { activity, windowListeners } = loadActivityScript({ hostname: 'news.example.com' });
    const feedItem = {
      nodeType: 1,
      tagName: 'ARTICLE',
      innerText: 'Endless updates',
      textContent: '',
      parentElement: null,
      closest() {
        return null;
      },
      getAttribute(name) {
        return name === 'role' ? 'feed' : '';
      },
      matches(selector) {
        return selector.includes('[role="feed"]');
      }
    };

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});
    windowListeners.get('click')({ target: feedItem });

    const signals = activity.getActivitySignals();

    assert.equal(signals.recommenderClickEvents, 1);
    assert.equal(signals.recommendationClickEvents, 0);
    assert.equal(signals.feedClickEvents, 1);
    assert.equal(signals.commentClickEvents, 0);
  });

  it('counts site-specific comment zone clicks separately from feed clicks', () => {
    const { activity, windowListeners } = loadActivityScript({ hostname: 'www.reddit.com' });
    const commentTree = {
      nodeType: 1,
      tagName: 'SHREDDIT-COMMENT-TREE',
      innerText: 'Nested discussion',
      textContent: '',
      parentElement: null,
      closest() {
        return null;
      },
      getAttribute() {
        return '';
      },
      matches(selector) {
        return selector.includes('shreddit-comment-tree');
      }
    };

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});
    windowListeners.get('click')({ target: commentTree });

    const signals = activity.getActivitySignals();

    assert.equal(signals.recommenderClickEvents, 1);
    assert.equal(signals.recommendationClickEvents, 0);
    assert.equal(signals.feedClickEvents, 0);
    assert.equal(signals.commentClickEvents, 1);
  });

  it('counts generic repeated card grids as feed clicks', () => {
    const { activity, windowListeners } = loadActivityScript({ hostname: 'articles.example.com' });
    const cards = Array.from({ length: 5 }, (_, index) => createFakeElement({
      tagName: 'ARTICLE',
      attrs: { class: 'story-card' },
      children: [
        createFakeElement({
          tagName: 'A',
          attrs: { href: `/story-${index}` },
          text: `Story ${index}`,
          children: [
            createFakeElement({ tagName: 'IMG' })
          ]
        })
      ]
    }));
    const grid = createFakeElement({
      attrs: { class: 'story-grid' },
      children: cards
    });

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});
    windowListeners.get('click')({ target: grid.children[2].children[0] });

    const signals = activity.getActivitySignals();

    assert.equal(signals.recommenderClickEvents, 1);
    assert.equal(signals.recommendationClickEvents, 0);
    assert.equal(signals.feedClickEvents, 1);
    assert.equal(signals.commentClickEvents, 0);
  });

  it('does not count repeated plain navigation links as feed clicks', () => {
    const { activity, windowListeners } = loadActivityScript({ hostname: 'docs.example.com' });
    const links = Array.from({ length: 8 }, (_, index) => createFakeElement({
      tagName: 'LI',
      attrs: { class: 'nav-link' },
      children: [
        createFakeElement({
          tagName: 'A',
          attrs: { href: `/section-${index}` },
          text: `Section ${index}`
        })
      ]
    }));
    const navList = createFakeElement({
      tagName: 'UL',
      attrs: { class: 'site-navigation' },
      children: links
    });

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});
    windowListeners.get('click')({ target: navList.children[3].children[0] });

    const signals = activity.getActivitySignals();

    assert.equal(signals.clickEvents, 1);
    assert.equal(signals.recommenderClickEvents, 0);
    assert.equal(signals.recommendationClickEvents, 0);
    assert.equal(signals.feedClickEvents, 0);
    assert.equal(signals.commentClickEvents, 0);
  });

  it('does not count unrelated clicks as recommendation clicks', () => {
    const { activity, windowListeners } = loadActivityScript({ hostname: 'docs.example.com' });
    const normalLink = {
      nodeType: 1,
      tagName: 'A',
      innerText: 'Reference',
      textContent: '',
      parentElement: null,
      closest(selector) {
        return selector === 'a[href]' ? normalLink : null;
      },
      getAttribute(name) {
        return name === 'href' ? '/reference' : '';
      },
      matches() {
        return false;
      }
    };

    activity.resetActivitySignals();
    activity.installActivitySignalListeners(() => {});
    windowListeners.get('click')({ target: normalLink });

    const signals = activity.getActivitySignals();

    assert.equal(signals.clickEvents, 1);
    assert.equal(signals.recommenderClickEvents, 0);
    assert.equal(signals.recommendationClickEvents, 0);
    assert.equal(signals.feedClickEvents, 0);
    assert.equal(signals.commentClickEvents, 0);
  });
});
