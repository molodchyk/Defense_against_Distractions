// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const elementBlocking = global.DAD.ElementBlocking = global.DAD.ElementBlocking || {};
  const {
    BLOCKED_ATTRIBUTE,
    DEFAULT_ANCESTOR_DEPTH,
    DEFAULT_MIN_SCORE
  } = elementBlocking.constants;
  const {
    createFingerprint,
    isPickableElement,
    normalizeNumber
  } = elementBlocking.fingerprint;

  function tokenOverlap(first = [], second = []) {
    const firstSet = new Set(first);
    return second.filter(token => firstSet.has(token)).length;
  }

  function hasAncestorPrefixMatch(candidateAncestors, ruleAncestors, depth) {
    if (!depth) return true;

    for (let index = 0; index < depth; index++) {
      if (!ruleAncestors[index]) return true;
      if (candidateAncestors[index] !== ruleAncestors[index]) return false;
    }

    return true;
  }

  function hasPositionPathMatch(candidatePath, rulePath, depth) {
    const pathDepth = Math.max(1, Math.min(depth + 1, rulePath.length));

    for (let index = 0; index < pathDepth; index++) {
      if (candidatePath[index] !== rulePath[index]) return false;
    }

    return true;
  }

  function scoreElementMatch(element, rule) {
    const { fingerprint } = rule;
    const candidate = createFingerprint(element);
    let score = 0;

    if (candidate.tag !== fingerprint.tag) return 0;
    score += 3;

    if (fingerprint.role && candidate.role === fingerprint.role) score += 2;
    if (fingerprint.inputType && candidate.inputType === fingerprint.inputType) score += 2;
    if (candidate.parentTag === fingerprint.parentTag) score += 2;
    if (fingerprint.parentRole && candidate.parentRole === fingerprint.parentRole) score += 2;
    if (candidate.childCount === fingerprint.childCount) score += 1;
    if (candidate.tagIndex === fingerprint.tagIndex) score += 3;

    const childOverlap = tokenOverlap(candidate.childSignature, fingerprint.childSignature);
    const ancestorOverlap = tokenOverlap(candidate.ancestorSignature, fingerprint.ancestorSignature);
    const classOverlap = tokenOverlap(candidate.classTokens, fingerprint.classTokens);
    const labelOverlap = tokenOverlap(candidate.labelTokens, fingerprint.labelTokens);
    const directTextOverlap = tokenOverlap(candidate.directTextTokens, fingerprint.directTextTokens);

    score += Math.min(3, childOverlap);
    score += Math.min(3, ancestorOverlap);
    score += Math.min(3, classOverlap);
    score += Math.min(6, directTextOverlap * 3);
    if ((rule.labelMatch || 'prefer') !== 'ignore') {
      score += Math.min(4, labelOverlap * 2);
    }

    return score;
  }

  function matchesElementRule(element, rule) {
    if (!isPickableElement(element) || element.hasAttribute(BLOCKED_ATTRIBUTE)) {
      return false;
    }

    const candidate = createFingerprint(element);
    const strategy = rule.strategy || rule.mode || 'samePosition';
    const ancestorDepth = normalizeNumber(rule.ancestorDepth, DEFAULT_ANCESTOR_DEPTH, 0, 6);
    const minScore = normalizeNumber(rule.minScore, DEFAULT_MIN_SCORE, 6, 24);
    const labelOverlap = tokenOverlap(candidate.labelTokens, rule.fingerprint.labelTokens);

    if (strategy === 'sameText') {
      const directTextOverlap = tokenOverlap(candidate.directTextTokens, rule.fingerprint.directTextTokens);
      const combinedLabelOverlap = labelOverlap + directTextOverlap;
      return combinedLabelOverlap > 0 && candidate.tag === rule.fingerprint.tag;
    }

    if (!hasAncestorPrefixMatch(candidate.ancestorSignature, rule.fingerprint.ancestorSignature, ancestorDepth)) {
      return false;
    }

    if (strategy === 'samePosition' && !hasPositionPathMatch(candidate.positionPath, rule.fingerprint.positionPath || [], 1)) {
      return false;
    }

    if (strategy === 'exact') {
      if (!hasPositionPathMatch(candidate.positionPath, rule.fingerprint.positionPath || [], ancestorDepth)) return false;
      if (candidate.parentTag !== rule.fingerprint.parentTag) return false;
    }

    if ((rule.labelMatch || 'prefer') === 'require' && rule.fingerprint.labelTokens.length > 0 && labelOverlap === 0) {
      return false;
    }

    return scoreElementMatch(element, rule) >= minScore;
  }

  elementBlocking.matcher = {
    matchesElementRule,
    scoreElementMatch
  };
})(window);
