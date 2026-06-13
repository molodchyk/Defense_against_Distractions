// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};

  const MAX_ANCESTOR_DEPTH = 8;
  const MAX_STRUCTURAL_CHILDREN = 80;
  const MIN_STRUCTURAL_CARD_COUNT = 4;
  const GENERIC_FEED_SELECTOR = [
    '[role="feed"]',
    '[aria-label*="feed" i]',
    '[aria-label*="timeline" i]',
    '[class*="feed" i]',
    '[id*="feed" i]'
  ].join(', ');
  const GENERIC_RECOMMENDATION_SELECTOR = [
    '[aria-label*="recommend" i]',
    '[aria-label*="suggest" i]',
    '[aria-label*="trending" i]',
    '[class*="recommend" i]',
    '[id*="recommend" i]'
  ].join(', ');
  const COMMENT_ZONE_ATTRIBUTE_PATTERN = /comment|reply|discussion|thread/i;
  const CARD_ATTRIBUTE_PATTERN = /card|tile|post|entry|result|story|video|thumb|thumbnail|media/i;
  const FEED_ZONE_ATTRIBUTE_PATTERN = /feed|timeline|for-you|foryou|home-feed|popular|explore|shorts|reels|stories/i;
  const RECOMMENDER_ZONE_ATTRIBUTE_PATTERN = /recommend|related|suggest|upnext|up-next|watch-next|more-like|trending|sidebar|rail/i;
  const SITE_ZONE_SELECTORS = [
    {
      hostPattern: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/,
      type: 'recommendation',
      selector: [
        'ytd-watch-next-secondary-results-renderer',
        'ytd-compact-video-renderer',
        'ytd-rich-grid-renderer',
        'ytd-reel-shelf-renderer',
        '#related',
        '#secondary',
        'a[href*="/shorts/"]'
      ].join(', ')
    },
    {
      hostPattern: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/,
      type: 'comment',
      selector: 'ytd-comments'
    },
    {
      hostPattern: /(^|\.)reddit\.com$/,
      type: 'feed',
      selector: [
        'shreddit-feed',
        '[data-testid*="post" i]'
      ].join(', ')
    },
    {
      hostPattern: /(^|\.)reddit\.com$/,
      type: 'comment',
      selector: [
        'shreddit-comment-tree',
        '[data-click-id="comments"]',
        '[id*="comment" i]'
      ].join(', ')
    },
    {
      hostPattern: /(^|\.)x\.com$|(^|\.)twitter\.com$/,
      type: 'feed',
      selector: [
        '[aria-label*="Timeline" i]',
        '[aria-label*="Trending" i]',
        '[data-testid="cellInnerDiv"]',
        '[data-testid="sidebarColumn"]'
      ].join(', ')
    },
    {
      hostPattern: /(^|\.)instagram\.com$/,
      type: 'feed',
      selector: [
        'a[href*="/explore/"]',
        'a[href*="/reels/"]',
        '[aria-label*="Explore" i]',
        '[aria-label*="Reels" i]'
      ].join(', ')
    },
    {
      hostPattern: /(^|\.)facebook\.com$/,
      type: 'feed',
      selector: [
        '[role="feed"]',
        '[aria-label*="Stories" i]',
        '[aria-label*="Reels" i]',
        '[data-pagelet*="FeedUnit" i]',
        '[data-pagelet*="Stories" i]'
      ].join(', ')
    }
  ];

  function getHostname() {
    return String(global.location?.hostname || global.document?.location?.hostname || '')
      .replace(/^www\./i, '')
      .toLowerCase();
  }

  function getElementAttributeText(element) {
    if (!element?.getAttribute) {
      return '';
    }

    return [
      element.tagName,
      element.getAttribute('role'),
      element.getAttribute('id'),
      element.getAttribute('class'),
      element.getAttribute('aria-label'),
      element.getAttribute('data-testid'),
      element.getAttribute('data-test-id'),
      element.getAttribute('data-test'),
      element.getAttribute('data-pagelet')
    ].filter(Boolean).join(' ');
  }

  function getAttributeZoneType(element) {
    const attributeText = getElementAttributeText(element);
    if (COMMENT_ZONE_ATTRIBUTE_PATTERN.test(attributeText)) {
      return 'comment';
    }

    if (FEED_ZONE_ATTRIBUTE_PATTERN.test(attributeText)) {
      return 'feed';
    }

    if (RECOMMENDER_ZONE_ATTRIBUTE_PATTERN.test(attributeText)) {
      return 'recommendation';
    }

    return null;
  }

  function getSiteZoneType(element, hostname) {
    const match = SITE_ZONE_SELECTORS.find(({ hostPattern, selector }) => {
      return hostPattern.test(hostname) && element.matches?.(selector);
    });
    return match?.type || null;
  }

  function getElementChildren(element) {
    return Array.from(element?.children || []).slice(0, MAX_STRUCTURAL_CHILDREN);
  }

  function elementMatches(element, selector) {
    try {
      return element?.matches?.(selector) === true;
    } catch (error) {
      return false;
    }
  }

  function elementQuerySelector(element, selector) {
    try {
      return element?.querySelector?.(selector) || null;
    } catch (error) {
      return null;
    }
  }

  function containsElement(container, target) {
    if (!container || !target) {
      return false;
    }

    if (container === target) {
      return true;
    }

    if (typeof container.contains === 'function') {
      return container.contains(target);
    }

    let element = target?.parentElement;
    while (element) {
      if (element === container) {
        return true;
      }
      element = element.parentElement;
    }

    return false;
  }

  function hasInteractiveTarget(element) {
    return elementMatches(element, 'a[href], button, [role="button"], [role="link"]')
      || Boolean(elementQuerySelector(element, 'a[href], button, [role="button"], [role="link"]'));
  }

  function hasVisualMedia(element) {
    return elementMatches(element, 'img, picture, video, canvas, svg')
      || Boolean(elementQuerySelector(element, 'img, picture, video, canvas, svg'));
  }

  function isSemanticCard(element) {
    const tagName = String(element?.tagName || '').toUpperCase();
    const role = String(element?.getAttribute?.('role') || '').toLowerCase();
    return tagName === 'ARTICLE'
      || role === 'article'
      || role === 'listitem'
      || role === 'gridcell'
      || CARD_ATTRIBUTE_PATTERN.test(getElementAttributeText(element));
  }

  function isGenericContentCard(element) {
    return hasInteractiveTarget(element)
      && (hasVisualMedia(element) || isSemanticCard(element));
  }

  function getStructuralZoneType(target) {
    let element = target?.nodeType === global.Node?.ELEMENT_NODE ? target : target?.parentElement;
    let depth = 0;

    while (element && depth < MAX_ANCESTOR_DEPTH) {
      const parent = element.parentElement;
      const children = getElementChildren(parent);
      if (children.length >= MIN_STRUCTURAL_CARD_COUNT) {
        const cardChildren = children.filter(isGenericContentCard);
        if (
          cardChildren.length >= MIN_STRUCTURAL_CARD_COUNT
          && cardChildren.some(child => containsElement(child, target))
        ) {
          return 'feed';
        }
      }

      element = parent;
      depth += 1;
    }

    return null;
  }

  function getElementZoneType(element, hostname) {
    if (element.matches?.(GENERIC_FEED_SELECTOR)) {
      return 'feed';
    }

    if (element.matches?.(GENERIC_RECOMMENDATION_SELECTOR)) {
      return 'recommendation';
    }

    return getSiteZoneType(element, hostname) || getAttributeZoneType(element);
  }

  function getRecommenderZoneType(target) {
    const hostname = getHostname();
    let element = target?.nodeType === global.Node?.ELEMENT_NODE ? target : target?.parentElement;
    let depth = 0;

    while (element && depth < MAX_ANCESTOR_DEPTH) {
      const zoneType = getElementZoneType(element, hostname);
      if (zoneType) {
        return zoneType;
      }

      element = element.parentElement;
      depth += 1;
    }

    return getStructuralZoneType(target);
  }

  function isRecommenderZoneClick(target) {
    return getRecommenderZoneType(target) !== null;
  }

  global.DAD.PageSignalRecommenderZones = {
    getRecommenderZoneType,
    isRecommenderZoneClick
  };
})(window);
