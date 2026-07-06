// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const SELECTED_TEXT_CANDIDATE_LIMIT = 160;
export const SELECTED_TEXT_SOURCE_LIMIT = 1000;
export const SELECTED_TEXT_TOKEN_LIMIT = 12;

export function normalizeSelectedTextValue(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function capSelectedTextValue(value) {
  const text = String(value || '');
  if (text.length <= SELECTED_TEXT_CANDIDATE_LIMIT) {
    return text;
  }

  return text.slice(0, SELECTED_TEXT_CANDIDATE_LIMIT).trimEnd();
}

export function extractSelectedTextTokens(value, limit = SELECTED_TEXT_TOKEN_LIMIT) {
  const tokens = [];
  const seen = new Set();
  const text = normalizeSelectedTextValue(value).toLowerCase();
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}_-]{1,39}/gu) || [];

  for (const match of matches) {
    if (seen.has(match)) {
      continue;
    }
    seen.add(match);
    tokens.push(match);
    if (tokens.length >= limit) {
      break;
    }
  }

  return tokens;
}

export function estimateSelectedTextScore({ normalizedText, tokens = [], insideEditable = false } = {}) {
  const text = normalizeSelectedTextValue(normalizedText);
  const tokenCount = Array.isArray(tokens) ? tokens.length : 0;
  if (tokenCount === 0) {
    return 0;
  }

  let score = 10;
  if (tokenCount === 1) {
    score = String(tokens[0] || '').length >= 8 ? 20 : 12;
  } else if (tokenCount <= 3) {
    score = 28;
  } else {
    score = 36;
  }

  if (text.length >= 48) {
    score += 4;
  }

  if (/\p{N}/u.test(text)) {
    score += 4;
  }

  if (insideEditable) {
    score -= 10;
  }

  return Math.min(Math.max(Math.round(score), 5), 60);
}

export function createSelectedTextCandidateFromText(value, options = {}) {
  const normalizedText = normalizeSelectedTextValue(value);
  if (
    normalizedText.length < 2
    || normalizedText.length > SELECTED_TEXT_SOURCE_LIMIT
    || !/[\p{L}\p{N}]/u.test(normalizedText)
  ) {
    return null;
  }

  const text = capSelectedTextValue(normalizedText);
  const tokens = Array.isArray(options.tokens) && options.tokens.length > 0
    ? options.tokens.map(token => String(token || '').toLowerCase()).filter(Boolean).slice(0, SELECTED_TEXT_TOKEN_LIMIT)
    : extractSelectedTextTokens(text);
  if (tokens.length === 0) {
    return null;
  }

  const insideEditable = options.insideEditable === true;
  const estimatedScore100 = Number.isFinite(Number(options.estimatedScore100))
    ? Math.min(Math.max(Math.round(Number(options.estimatedScore100)), 0), 100)
    : estimateSelectedTextScore({ normalizedText, tokens, insideEditable });

  return {
    text,
    normalizedText: text.toLowerCase(),
    tokens,
    host: String(options.host || ''),
    source: String(options.source || 'userSelection'),
    insideEditable,
    selectionLength: normalizedText.length,
    estimatedScore100,
    wouldBlockCurrentPage: options.wouldBlockCurrentPage === true
  };
}

export function normalizeSelectedTextCandidate(candidate = null) {
  const text = normalizeSelectedTextValue(candidate?.text);
  if (text.length < 2 || !/[\p{L}\p{N}]/u.test(text)) {
    return null;
  }

  const score = Number(candidate?.estimatedScore100);
  return {
    text: capSelectedTextValue(text),
    estimatedScore100: Number.isFinite(score) ? Math.min(Math.max(Math.round(score), 0), 100) : 25,
    insideEditable: candidate?.insideEditable === true
  };
}

export function formatSelectedTextCandidateSummary(candidate = null, editableLabel = 'editable') {
  const normalizedCandidate = normalizeSelectedTextCandidate(candidate);
  if (!normalizedCandidate) {
    return '';
  }

  const parts = [
    normalizedCandidate.text,
    `${normalizedCandidate.estimatedScore100}/100`
  ];

  if (normalizedCandidate.insideEditable) {
    parts.push(editableLabel);
  }

  return parts.join(' - ');
}

export function formatSelectedTextCandidateEditorText(candidate = null) {
  const normalizedCandidate = normalizeSelectedTextCandidate(candidate);
  if (!normalizedCandidate) {
    return '';
  }

  return `${escapeKeywordPhrase(normalizedCandidate.text)}, ${normalizedCandidate.estimatedScore100}/100`;
}

function escapeKeywordPhrase(value) {
  return String(value || '').replace(/,/g, '\\,');
}
