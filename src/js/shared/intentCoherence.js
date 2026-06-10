// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export const INTENT_TRAJECTORY_STORAGE_KEY = 'intentTrajectoryState';
export const DEFAULT_INTENT_CHAIN_BLOCK_COOLDOWN_MS = 45 * 1000;

export const INTENT_INTERVENTION_ACTIONS = {
  WARN: 'warn',
  GRAYSCALE: 'grayscale',
  PROMPT: 'prompt',
  BLOCK: 'block'
};

export const INTENT_POMODORO_INFLUENCE_MODES = {
  IGNORE: 'ignore',
  WORK_STRICTER: 'workStricter',
  BREAK_LENIENT: 'breakLenient',
  BOTH: 'both'
};

export const DEFAULT_INTENT_SETTINGS = {
  enabled: true,
  action: INTENT_INTERVENTION_ACTIONS.PROMPT,
  interventionThreshold: 40,
  lockedThreshold: 20,
  pomodoroInfluence: INTENT_POMODORO_INFLUENCE_MODES.BOTH,
  diagnosticsRetentionDays: 7,
  autoCalibration: true
};

export const DEFAULT_INTENT_OPTIONS = {
  idleResetMs: 15 * 60 * 1000,
  maxSessions: 6,
  maxVisitsPerSession: 80,
  maxTabLineageEntries: 120,
  maxFeedbackEntries: 80,
  chainBlockCooldownMs: DEFAULT_INTENT_CHAIN_BLOCK_COOLDOWN_MS,
  intentSettings: DEFAULT_INTENT_SETTINGS,
  now: () => Date.now()
};

export const INTENT_INTERVENTION_RISK_STATES = ['intervene', 'locked'];

const TOKEN_LIMIT = 40;
const TEXT_TOKEN_LIMIT = 24;
const MIN_RATE_WINDOW_MS = 30 * 1000;
const MAX_RATE_PER_MINUTE = 600;
const MIN_DIAGNOSTICS_RETENTION_DAYS = 1;
const MAX_DIAGNOSTICS_RETENTION_DAYS = 30;
const MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION = 5;
const HELPFUL_INTERVENTION_THRESHOLD_DELTA = 6;
const TOO_SENSITIVE_THRESHOLD_DELTA = -6;
const INTENT_TRANSITION_TYPES = new Set([
  'link',
  'typed',
  'auto_bookmark',
  'auto_subframe',
  'manual_subframe',
  'generated',
  'auto_toplevel',
  'form_submit',
  'reload',
  'keyword',
  'keyword_generated'
]);
const INTENT_TRANSITION_QUALIFIERS = new Set([
  'client_redirect',
  'server_redirect',
  'forward_back',
  'from_address_bar'
]);
const INTENT_FEEDBACK_ACTIONS = new Set([
  'acknowledge',
  'continue',
  'isolate',
  'return',
  'dismiss'
]);
const INTENT_FEEDBACK_RECOMMENDATIONS = {
  INSUFFICIENT_DATA: 'insufficientData',
  INTERVENTIONS_HELPFUL: 'interventionsHelpful',
  TOO_SENSITIVE: 'tooSensitive',
  MIXED: 'mixed'
};
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'com',
  'de',
  'der',
  'die',
  'das',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'mit',
  'of',
  'on',
  'or',
  'the',
  'to',
  'und',
  'von',
  'what',
  'www'
]);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(number), min), max);
}

function getTimestamp(options = {}) {
  return Number(options.now?.() || Date.now());
}

function parseTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map(item => normalizeString(item)).filter(Boolean)
    : [];
}

function getHostnameFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeComparableUrl(url) {
  const normalizedUrl = normalizeString(url);
  if (!normalizedUrl) {
    return '';
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    parsedUrl.hash = '';
    return parsedUrl.toString();
  } catch {
    return normalizedUrl.split('#')[0];
  }
}

function tokenize(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/https?:\/\//g, ' ')
    .split(/[^\p{L}\p{N}_]+/u)
    .map(token => token.replace(/^[_-]+|[_-]+$/g, ''))
    .filter(token => token.length >= 2 && !STOP_WORDS.has(token))
    .slice(0, TOKEN_LIMIT);
}

function uniqueTokens(tokens) {
  return Array.from(new Set(tokens));
}

function normalizeDurationMs(value, fallback = 0) {
  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? Math.max(0, normalizedValue) : fallback;
}

function normalizeEventCount(value) {
  return Math.max(0, Number(value || 0));
}

function normalizeTransitionType(value) {
  const normalizedValue = normalizeString(value);
  return INTENT_TRANSITION_TYPES.has(normalizedValue) ? normalizedValue : null;
}

function normalizeTransitionQualifiers(value = []) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(normalizeString).filter(qualifier => INTENT_TRANSITION_QUALIFIERS.has(qualifier))))
    : [];
}

function calculateRatePerMinute(count, activePageMs, pageAgeMs) {
  const eventCount = normalizeEventCount(count);
  if (eventCount <= 0) {
    return 0;
  }

  const measuredMs = activePageMs > 0 ? activePageMs : pageAgeMs;
  const minutes = Math.max(measuredMs, MIN_RATE_WINDOW_MS) / (60 * 1000);
  return Math.min(MAX_RATE_PER_MINUTE, Number((eventCount / minutes).toFixed(3)));
}

function normalizeRatePerMinute(value, count, activePageMs, pageAgeMs) {
  const normalizedValue = Number(value);
  if (Number.isFinite(normalizedValue)) {
    return Math.min(MAX_RATE_PER_MINUTE, Math.max(0, Number(normalizedValue.toFixed(3))));
  }

  return calculateRatePerMinute(count, activePageMs, pageAgeMs);
}

export function normalizeIntentSettings(settings = {}) {
  const interventionThreshold = clampNumber(
    settings.interventionThreshold,
    DEFAULT_INTENT_SETTINGS.interventionThreshold,
    1,
    99
  );
  const lockedThreshold = clampNumber(
    settings.lockedThreshold,
    DEFAULT_INTENT_SETTINGS.lockedThreshold,
    0,
    interventionThreshold - 1
  );
  const action = Object.values(INTENT_INTERVENTION_ACTIONS).includes(settings.action)
    ? settings.action
    : DEFAULT_INTENT_SETTINGS.action;
  const pomodoroInfluence = Object.values(INTENT_POMODORO_INFLUENCE_MODES).includes(settings.pomodoroInfluence)
    ? settings.pomodoroInfluence
    : DEFAULT_INTENT_SETTINGS.pomodoroInfluence;
  const diagnosticsRetentionDays = clampNumber(
    settings.diagnosticsRetentionDays,
    DEFAULT_INTENT_SETTINGS.diagnosticsRetentionDays,
    MIN_DIAGNOSTICS_RETENTION_DAYS,
    MAX_DIAGNOSTICS_RETENTION_DAYS
  );

  return {
    enabled: settings.enabled !== false,
    action,
    interventionThreshold,
    lockedThreshold,
    pomodoroInfluence,
    diagnosticsRetentionDays,
    autoCalibration: settings.autoCalibration !== false
  };
}

function normalizeTokenArray(value, limit = TOKEN_LIMIT) {
  return Array.isArray(value)
    ? uniqueTokens(value.flatMap(token => tokenize(token))).slice(0, limit)
    : [];
}

export function extractIntentTokens(signal = {}) {
  const url = normalizeString(signal.url);
  const hostname = normalizeString(signal.hostname) || getHostnameFromUrl(url);
  const title = normalizeString(signal.title);

  return uniqueTokens([
    ...tokenize(hostname),
    ...tokenize(url),
    ...tokenize(title)
  ]);
}

function extractTextTokens(signal = {}) {
  return normalizeTokenArray(signal.text?.topTokens, TEXT_TOKEN_LIMIT);
}

export function calculateTokenSimilarity(firstTokens = [], secondTokens = []) {
  const first = new Set(firstTokens);
  const second = new Set(secondTokens);

  if (first.size === 0 && second.size === 0) {
    return 1;
  }

  if (first.size === 0 || second.size === 0) {
    return 0;
  }

  let intersection = 0;
  first.forEach(token => {
    if (second.has(token)) {
      intersection += 1;
    }
  });

  const union = new Set([...first, ...second]).size;
  return union === 0 ? 0 : intersection / union;
}

export function normalizePageSignalForIntent(signal = {}, options = {}) {
  const url = normalizeString(signal.url);
  const hostname = normalizeString(signal.hostname) || getHostnameFromUrl(url);
  const title = normalizeString(signal.title);
  const collectedAt = normalizeString(signal.collectedAt) || new Date(getTimestamp(options)).toISOString();
  const metadataTokens = extractIntentTokens({ url, hostname, title });
  const textTokens = extractTextTokens(signal);
  const tokens = uniqueTokens([...metadataTokens, ...textTokens]).slice(0, TOKEN_LIMIT + TEXT_TOKEN_LIMIT);
  const pageAgeMs = normalizeDurationMs(signal.activity?.pageAgeMs);
  const activePageMs = Math.min(
    pageAgeMs,
    normalizeDurationMs(signal.activity?.activePageMs, pageAgeMs)
  );
  const scrollEvents = normalizeEventCount(signal.activity?.scrollEvents);
  const clickEvents = normalizeEventCount(signal.activity?.clickEvents);
  const recommenderClickEvents = normalizeEventCount(signal.activity?.recommenderClickEvents);
  const keyEvents = normalizeEventCount(signal.activity?.keyEvents);
  const inputEvents = normalizeEventCount(signal.activity?.inputEvents);

  return {
    url,
    hostname,
    title,
    collectedAt,
    tokens,
    metadataTokens,
    textTokens,
    text: {
      wordCount: Number(signal.text?.wordCount || 0),
      sampleLength: Number(signal.text?.sampleLength || 0),
      emojiCount: Number(signal.text?.emojiCount || 0),
      topTokens: textTokens
    },
    media: {
      imageCount: Number(signal.media?.imageCount || 0),
      videoCount: Number(signal.media?.videoCount || 0),
      audioCount: Number(signal.media?.audioCount || 0),
      gifCount: Number(signal.media?.gifCount || 0),
      iframeCount: Number(signal.media?.iframeCount || 0)
    },
    interaction: {
      linkCount: Number(signal.interaction?.linkCount || 0),
      buttonCount: Number(signal.interaction?.buttonCount || 0),
      inputCount: Number(signal.interaction?.inputCount || 0),
      formCount: Number(signal.interaction?.formCount || 0)
    },
    structure: {
      elementCount: Number(signal.structure?.elementCount || 0),
      feedCount: Number(signal.structure?.feedCount || 0)
    },
    activity: {
      pageAgeMs,
      activePageMs,
      scrollEvents,
      clickEvents,
      recommenderClickEvents,
      keyEvents,
      inputEvents,
      scrollRatePerMinute: normalizeRatePerMinute(signal.activity?.scrollRatePerMinute, scrollEvents, activePageMs, pageAgeMs),
      clickRatePerMinute: normalizeRatePerMinute(signal.activity?.clickRatePerMinute, clickEvents, activePageMs, pageAgeMs),
      recommenderClickRatePerMinute: normalizeRatePerMinute(signal.activity?.recommenderClickRatePerMinute, recommenderClickEvents, activePageMs, pageAgeMs),
      keyRatePerMinute: normalizeRatePerMinute(signal.activity?.keyRatePerMinute, keyEvents, activePageMs, pageAgeMs),
      inputRatePerMinute: normalizeRatePerMinute(signal.activity?.inputRatePerMinute, inputEvents, activePageMs, pageAgeMs),
      maxScrollDepthRatio: clamp(Number(signal.activity?.maxScrollDepthRatio || 0), 0, 1)
    }
  };
}

export function normalizeIntentNavigationTransition(transition = {}, options = {}) {
  const now = getTimestamp(options);
  const tabId = normalizeTabId(transition.tabId);
  return {
    tabId,
    frameId: Number.isFinite(Number(transition.frameId)) ? Number(transition.frameId) : null,
    url: normalizeString(transition.url),
    transitionType: normalizeTransitionType(transition.transitionType),
    transitionQualifiers: normalizeTransitionQualifiers(transition.transitionQualifiers),
    transitionSource: normalizeString(transition.transitionSource || transition.source),
    transitionAt: normalizeString(transition.transitionAt) || new Date(now).toISOString()
  };
}

export function createIntentTrajectoryState(now = Date.now()) {
  return {
    version: 1,
    activeTabId: null,
    activeSessionId: null,
    updatedAt: new Date(now).toISOString(),
    sessions: [],
    tabLineage: [],
    feedback: []
  };
}

function normalizeTabId(tabId) {
  const normalizedTabId = Number(tabId);
  return Number.isFinite(normalizedTabId) ? normalizedTabId : null;
}

function normalizeTabLineageEntry(entry = {}) {
  const tabId = normalizeTabId(entry.tabId);
  if (!Number.isFinite(tabId)) {
    return null;
  }

  const openerTabId = normalizeTabId(entry.openerTabId);
  const rootTabId = normalizeTabId(entry.rootTabId);

  return {
    tabId,
    openerTabId,
    rootTabId: Number.isFinite(rootTabId) ? rootTabId : tabId,
    parentSessionId: typeof entry.parentSessionId === 'string' && entry.parentSessionId ? entry.parentSessionId : null,
    parentVisitId: typeof entry.parentVisitId === 'string' && entry.parentVisitId ? entry.parentVisitId : null,
    driftDescendant: entry.driftDescendant === true,
    transitionType: normalizeTransitionType(entry.transitionType),
    transitionQualifiers: normalizeTransitionQualifiers(entry.transitionQualifiers),
    transitionSource: normalizeString(entry.transitionSource) || null,
    transitionUrl: normalizeString(entry.transitionUrl) || null,
    transitionAt: normalizeString(entry.transitionAt) || null,
    createdAt: normalizeString(entry.createdAt) || null,
    updatedAt: normalizeString(entry.updatedAt) || normalizeString(entry.createdAt) || null
  };
}

function normalizeTabLineage(lineage = [], maxEntries = DEFAULT_INTENT_OPTIONS.maxTabLineageEntries) {
  return Array.isArray(lineage)
    ? lineage
      .map(normalizeTabLineageEntry)
      .filter(Boolean)
      .slice(-maxEntries)
    : [];
}

function normalizeIntentFeedbackAction(value) {
  const normalizedValue = normalizeString(value);
  return INTENT_FEEDBACK_ACTIONS.has(normalizedValue) ? normalizedValue : 'dismiss';
}

function normalizeIntentFeedbackEntry(entry = {}) {
  return {
    id: normalizeString(entry.id),
    recordedAt: normalizeString(entry.recordedAt),
    action: normalizeIntentFeedbackAction(entry.action),
    interventionId: normalizeString(entry.interventionId).slice(0, 180) || null,
    sessionId: normalizeString(entry.sessionId).slice(0, 120) || null,
    visitId: normalizeString(entry.visitId).slice(0, 120) || null,
    tabId: normalizeTabId(entry.tabId),
    riskState: normalizeString(entry.riskState).slice(0, 32) || null,
    coherenceScore: clampNumber(entry.coherenceScore, null, 0, 100),
    policyAction: normalizeString(entry.policyAction).slice(0, 32) || null,
    currentHostname: normalizeString(entry.currentHostname).slice(0, 120) || null,
    recoveryHostname: normalizeString(entry.recoveryHostname).slice(0, 120) || null
  };
}

function normalizeIntentFeedback(feedback = [], maxEntries = DEFAULT_INTENT_OPTIONS.maxFeedbackEntries) {
  return Array.isArray(feedback)
    ? feedback
      .map(normalizeIntentFeedbackEntry)
      .filter(entry => entry.id && entry.recordedAt)
      .slice(-maxEntries)
    : [];
}

function createEmptyFeedbackSummary() {
  return {
    total: 0,
    counts: {
      acknowledge: 0,
      continue: 0,
      isolate: 0,
      return: 0,
      dismiss: 0
    },
    returnRate: 0,
    isolateRate: 0,
    continueRate: 0,
    dismissRate: 0,
    averageCoherenceScore: null,
    recommendation: INTENT_FEEDBACK_RECOMMENDATIONS.INSUFFICIENT_DATA
  };
}

export function summarizeIntentFeedback(feedback = [], options = {}) {
  const entries = normalizeIntentFeedback(feedback, options.maxFeedbackEntries);
  if (entries.length === 0) {
    return createEmptyFeedbackSummary();
  }

  const counts = entries.reduce((result, entry) => {
    result[entry.action] = (result[entry.action] || 0) + 1;
    return result;
  }, {
    acknowledge: 0,
    continue: 0,
    isolate: 0,
    return: 0,
    dismiss: 0
  });
  const scoredEntries = entries.filter(entry => Number.isFinite(entry.coherenceScore));
  const averageCoherenceScore = scoredEntries.length > 0
    ? Math.round(scoredEntries.reduce((sum, entry) => sum + entry.coherenceScore, 0) / scoredEntries.length)
    : null;
  const total = entries.length;
  const returnRate = Number((counts.return / total).toFixed(3));
  const isolateRate = Number((counts.isolate / total).toFixed(3));
  const continueRate = Number(((counts.continue + counts.acknowledge) / total).toFixed(3));
  const dismissRate = Number((counts.dismiss / total).toFixed(3));
  let recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.INSUFFICIENT_DATA;

  if (total >= 5 && returnRate >= 0.5) {
    recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.INTERVENTIONS_HELPFUL;
  } else if (total >= 5 && isolateRate + continueRate >= 0.7) {
    recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.TOO_SENSITIVE;
  } else if (total >= 5) {
    recommendation = INTENT_FEEDBACK_RECOMMENDATIONS.MIXED;
  }

  return {
    total,
    counts,
    returnRate,
    isolateRate,
    continueRate,
    dismissRate,
    averageCoherenceScore,
    recommendation
  };
}

function createIntentCalibrationResult(settings, summary, overrides = {}) {
  const normalizedSettings = normalizeIntentSettings(settings);
  const normalizedSummary = summary && typeof summary === 'object'
    ? summary
    : createEmptyFeedbackSummary();
  const thresholdDelta = Number(overrides.thresholdDelta || 0);
  const effectiveInterventionThreshold = clampNumber(
    normalizedSettings.interventionThreshold + thresholdDelta,
    normalizedSettings.interventionThreshold,
    normalizedSettings.lockedThreshold + 1,
    99
  );
  const appliedDelta = effectiveInterventionThreshold - normalizedSettings.interventionThreshold;

  return {
    enabled: normalizedSettings.autoCalibration,
    applied: appliedDelta !== 0,
    reason: overrides.reason || 'No calibration adjustment applied',
    recommendation: normalizedSummary.recommendation || INTENT_FEEDBACK_RECOMMENDATIONS.INSUFFICIENT_DATA,
    feedbackTotal: Number(normalizedSummary.total || 0),
    thresholdDelta: appliedDelta,
    baselineInterventionThreshold: normalizedSettings.interventionThreshold,
    effectiveInterventionThreshold,
    lockedThreshold: normalizedSettings.lockedThreshold
  };
}

export function deriveIntentFeedbackCalibration(feedbackSummary = {}, settings = DEFAULT_INTENT_SETTINGS) {
  const normalizedSettings = normalizeIntentSettings(settings);
  const normalizedSummary = feedbackSummary && typeof feedbackSummary === 'object'
    ? feedbackSummary
    : createEmptyFeedbackSummary();
  const feedbackTotal = Number(normalizedSummary.total || 0);

  if (!normalizedSettings.autoCalibration) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      reason: 'Auto calibration disabled'
    });
  }

  if (feedbackTotal < MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      reason: `Needs ${MIN_FEEDBACK_ENTRIES_FOR_CALIBRATION} feedback entries before calibration`
    });
  }

  if (normalizedSummary.recommendation === INTENT_FEEDBACK_RECOMMENDATIONS.INTERVENTIONS_HELPFUL) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      thresholdDelta: HELPFUL_INTERVENTION_THRESHOLD_DELTA,
      reason: 'Return feedback suggests earlier interventions are helpful'
    });
  }

  if (normalizedSummary.recommendation === INTENT_FEEDBACK_RECOMMENDATIONS.TOO_SENSITIVE) {
    return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
      thresholdDelta: TOO_SENSITIVE_THRESHOLD_DELTA,
      reason: 'Continue/isolate feedback suggests interventions are too sensitive'
    });
  }

  return createIntentCalibrationResult(normalizedSettings, normalizedSummary, {
    reason: 'Feedback is mixed; keeping configured thresholds'
  });
}

export function applyIntentFeedbackCalibration(settings = DEFAULT_INTENT_SETTINGS, feedbackSummary = {}) {
  const normalizedSettings = normalizeIntentSettings(settings);
  const calibration = deriveIntentFeedbackCalibration(feedbackSummary, normalizedSettings);
  const calibratedSettings = normalizeIntentSettings({
    ...normalizedSettings,
    interventionThreshold: calibration.effectiveInterventionThreshold
  });

  return {
    ...calibratedSettings,
    calibration
  };
}

function normalizeIntentState(currentState, now, options = {}) {
  const baseState = currentState && typeof currentState === 'object'
    ? currentState
    : createIntentTrajectoryState(now);

  return {
    ...baseState,
    activeTabId: normalizeTabId(baseState.activeTabId),
    activeSessionId: typeof baseState.activeSessionId === 'string' && baseState.activeSessionId ? baseState.activeSessionId : null,
    updatedAt: normalizeString(baseState.updatedAt) || new Date(now).toISOString(),
    sessions: Array.isArray(baseState.sessions) ? [...baseState.sessions] : [],
    tabLineage: normalizeTabLineage(baseState.tabLineage, options.maxTabLineageEntries),
    feedback: normalizeIntentFeedback(baseState.feedback, options.maxFeedbackEntries)
  };
}

export function getIntentTabLineageEntry(state = {}, tabId = null) {
  const normalizedTabId = normalizeTabId(tabId);
  if (!Number.isFinite(normalizedTabId)) {
    return null;
  }

  return normalizeTabLineage(state.tabLineage).find(entry => entry.tabId === normalizedTabId) || null;
}

export function getIntentDriftDescendantTabIds(state = {}, options = {}) {
  const lineage = normalizeTabLineage(state.tabLineage, options.maxTabLineageEntries);
  const currentTabId = normalizeTabId(options.currentTabId ?? options.tabId);
  const currentLineage = Number.isFinite(currentTabId)
    ? lineage.find(entry => entry.tabId === currentTabId)
    : null;
  const explicitRootTabId = normalizeTabId(options.rootTabId);
  const rootTabId = Number.isFinite(explicitRootTabId)
    ? explicitRootTabId
    : currentLineage?.rootTabId;
  const includeCurrent = options.includeCurrent === true;
  const seenTabIds = new Set();

  return lineage
    .filter(entry => {
      if (!entry.driftDescendant || !Number.isFinite(entry.tabId)) {
        return false;
      }

      if (!includeCurrent && Number.isFinite(currentTabId) && entry.tabId === currentTabId) {
        return false;
      }

      if (Number.isFinite(rootTabId) && entry.rootTabId !== rootTabId) {
        return false;
      }

      if (seenTabIds.has(entry.tabId)) {
        return false;
      }

      seenTabIds.add(entry.tabId);
      return true;
    })
    .map(entry => entry.tabId);
}

function createSession(signal, visit, now) {
  return {
    id: `intent-session-${now}`,
    originVisitId: visit.id,
    createdAt: new Date(now).toISOString(),
    lastActiveAt: new Date(now).toISOString(),
    origin: {
      url: signal.url,
      hostname: signal.hostname,
      title: signal.title,
      tokens: signal.tokens,
      metadataTokens: signal.metadataTokens,
      textTokens: signal.textTokens
    },
    visits: [visit],
    metrics: calculateSessionMetrics([visit], visit),
    coherenceScore: 100,
    riskState: 'clear',
    firstDriftVisitId: null,
    lockedAt: null,
    driftDescendantAt: null
  };
}

function shouldStartNewSession(state, activeSession, now, options) {
  if (!activeSession) {
    return true;
  }

  const lastActiveMs = Date.parse(activeSession.lastActiveAt || state.updatedAt || 0);
  if (!Number.isFinite(lastActiveMs)) {
    return false;
  }

  return now - lastActiveMs >= options.idleResetMs;
}

export function getIntentRiskState(coherenceScore, settings = DEFAULT_INTENT_SETTINGS) {
  const normalizedSettings = normalizeIntentSettings(settings);
  if (!normalizedSettings.enabled) {
    return 'clear';
  }

  if (coherenceScore <= normalizedSettings.lockedThreshold) return 'locked';
  if (coherenceScore <= normalizedSettings.interventionThreshold) return 'intervene';
  if (coherenceScore >= 80) return 'clear';
  if (coherenceScore >= 60) return 'watch';
  return 'drift';
}

function calculatePassiveMediaLoad(signal) {
  const mediaScore = (
    signal.media.videoCount * 10 +
    signal.media.audioCount * 6 +
    signal.media.gifCount * 3 +
    Math.min(signal.media.imageCount, 40) * 0.5 +
    Math.min(signal.structure.feedCount, 5) * 8
  );
  return clamp(mediaScore / 35, 0, 1);
}

function calculateLinkDensity(signal) {
  if (signal.structure.elementCount <= 0) {
    return 0;
  }

  return clamp(signal.interaction.linkCount / signal.structure.elementCount, 0, 1);
}

function calculatePassiveInteractionLoad(signal) {
  const activity = signal.activity || {};
  const scrollLoad = clamp(Number(activity.scrollEvents || 0) / 30, 0, 1);
  const clickLoad = clamp(Number(activity.clickEvents || 0) / 24, 0, 1);
  const scrollDepth = clamp(Number(activity.maxScrollDepthRatio || 0), 0, 1);
  const activeInputLoad = calculateActiveInputLoad(signal);
  return clamp((scrollLoad * 0.45 + scrollDepth * 0.3 + clickLoad * 0.25) * (1 - activeInputLoad * 0.55), 0, 1);
}

function calculateActiveInputLoad(signal) {
  const activity = signal.activity || {};
  const inputEvents = Number(activity.inputEvents || 0);
  const keyEvents = Number(activity.keyEvents || 0);
  return clamp((inputEvents * 1.5 + keyEvents) / 18, 0, 1);
}

function calculateInteractionVelocityLoad(signal) {
  const activity = signal.activity || {};
  const activeInputLoad = calculateActiveInputLoad(signal);
  const scrollVelocity = clamp(Number(activity.scrollRatePerMinute || 0) / 60, 0, 1);
  const clickVelocity = clamp(Number(activity.clickRatePerMinute || 0) / 30, 0, 1);
  const inputVelocity = clamp(
    (Number(activity.inputRatePerMinute || 0) + Number(activity.keyRatePerMinute || 0) * 0.4) / 24,
    0,
    1
  );
  const passiveInputVelocity = Math.max(0, inputVelocity - activeInputLoad * 0.6);

  return clamp(scrollVelocity * 0.45 + clickVelocity * 0.4 + passiveInputVelocity * 0.15, 0, 1);
}

function calculateRecommenderClickLoad(signal) {
  const activity = signal.activity || {};
  const clickEvents = Number(activity.clickEvents || 0);
  const recommenderClickEvents = Number(activity.recommenderClickEvents || 0);
  if (recommenderClickEvents <= 0) {
    return 0;
  }

  const countLoad = clamp(recommenderClickEvents / 4, 0, 1);
  const rateLoad = clamp(Number(activity.recommenderClickRatePerMinute || 0) / 8, 0, 1);
  const dominanceLoad = clickEvents > 0 ? clamp(recommenderClickEvents / clickEvents, 0, 1) : 0;
  return clamp(countLoad * 0.4 + rateLoad * 0.35 + dominanceLoad * 0.25, 0, 1);
}

function calculateConstructiveDwell(signal) {
  const activity = signal.activity || {};
  const activeMinutes = Number(activity.activePageMs ?? activity.pageAgeMs ?? 0) / (60 * 1000);
  const textVolume = Number(signal.text?.wordCount || 0);
  const mediaLoad = calculatePassiveMediaLoad(signal);
  const activeInputLoad = calculateActiveInputLoad(signal);
  const readingLoad = textVolume >= 250 && mediaLoad < 0.35
    ? clamp(activeMinutes / 6, 0, 1)
    : 0;

  return clamp(Math.max(readingLoad, activeInputLoad), 0, 1);
}

function calculatePassiveTimeLoad(signal) {
  const activity = signal.activity || {};
  const activeMinutes = Number(activity.activePageMs ?? activity.pageAgeMs ?? 0) / (60 * 1000);
  if (activeMinutes <= 2) {
    return 0;
  }

  const passivePressure = Math.max(
    calculatePassiveMediaLoad(signal),
    calculatePassiveInteractionLoad(signal),
    calculateLinkDensity(signal)
  );
  return clamp(((activeMinutes - 2) / 8) * passivePressure, 0, 1);
}

function hasRedirectTransition(visit = {}) {
  const qualifiers = Array.isArray(visit.transitionQualifiers) ? visit.transitionQualifiers : [];
  return qualifiers.includes('client_redirect') || qualifiers.includes('server_redirect');
}

function calculateRedirectTransitionLoad(visits = []) {
  if (visits.length === 0) {
    return 0;
  }

  const redirectCount = visits.filter(hasRedirectTransition).length;
  if (redirectCount === 0) {
    return 0;
  }

  const recentRedirectCount = visits.slice(-4).filter(hasRedirectTransition).length;
  const chainShare = redirectCount / visits.length;
  return clamp(chainShare * 0.45 + (recentRedirectCount / 3) * 0.55, 0, 1);
}

function getVisitDurationMs(visit = {}, key) {
  return Math.max(0, Number(visit.signals?.activity?.[key] || visit[key] || 0));
}

function calculateDurationTotals(visits = []) {
  const durationByPage = new Map();
  visits.forEach((visit, index) => {
    const key = [
      Number.isFinite(visit.tabId) ? visit.tabId : 'tab',
      visit.url || visit.hostname || `visit-${index}`
    ].join('|');
    const current = durationByPage.get(key) || { dwellMs: 0, activeMs: 0 };
    durationByPage.set(key, {
      dwellMs: Math.max(current.dwellMs, getVisitDurationMs(visit, 'pageAgeMs')),
      activeMs: Math.max(current.activeMs, getVisitDurationMs(visit, 'activePageMs'))
    });
  });

  return Array.from(durationByPage.values()).reduce((totals, duration) => ({
    dwellMs: totals.dwellMs + duration.dwellMs,
    activeMs: totals.activeMs + duration.activeMs
  }), { dwellMs: 0, activeMs: 0 });
}

function calculateVisitSimilarity(firstVisit = {}, secondVisit = {}) {
  const metadataSimilarity = calculateTokenSimilarity(firstVisit.metadataTokens || firstVisit.tokens, secondVisit.metadataTokens || secondVisit.tokens);
  const firstTextTokens = firstVisit.textTokens || firstVisit.signals?.text?.topTokens || [];
  const secondTextTokens = secondVisit.textTokens || secondVisit.signals?.text?.topTokens || [];
  const hasTextSignals = firstTextTokens.length > 0 && secondTextTokens.length > 0;
  const textSimilarity = hasTextSignals ? calculateTokenSimilarity(firstTextTokens, secondTextTokens) : null;
  const combinedSimilarity = calculateTokenSimilarity(firstVisit.tokens, secondVisit.tokens);

  if (!hasTextSignals) {
    return {
      similarity: Number(combinedSimilarity.toFixed(3)),
      metadataSimilarity: Number(metadataSimilarity.toFixed(3)),
      textSimilarity: null
    };
  }

  return {
    similarity: Number((metadataSimilarity * 0.35 + textSimilarity * 0.55 + combinedSimilarity * 0.1).toFixed(3)),
    metadataSimilarity: Number(metadataSimilarity.toFixed(3)),
    textSimilarity: Number(textSimilarity.toFixed(3))
  };
}

function calculateSessionMetrics(visits, originVisit) {
  const domains = visits.map(visit => visit.hostname).filter(Boolean);
  const uniqueDomains = new Set(domains);
  const tabIds = visits.map(visit => visit.tabId).filter(Number.isFinite);
  const uniqueTabIds = new Set(tabIds);
  let domainChanges = 0;
  for (let index = 1; index < domains.length; index += 1) {
    if (domains[index] !== domains[index - 1]) {
      domainChanges += 1;
    }
  }

  const latestVisit = visits[visits.length - 1];
  const previousVisit = visits[visits.length - 2] || latestVisit;
  const originSimilarityResult = latestVisit
    ? calculateVisitSimilarity(originVisit, latestVisit)
    : { similarity: 1, metadataSimilarity: 1, textSimilarity: null };
  const localSimilarityResult = latestVisit && previousVisit
    ? calculateVisitSimilarity(previousVisit, latestVisit)
    : { similarity: 1, metadataSimilarity: 1, textSimilarity: null };
  const passiveMediaLoad = latestVisit ? calculatePassiveMediaLoad(latestVisit.signals) : 0;
  const passiveInteractionLoad = latestVisit ? calculatePassiveInteractionLoad(latestVisit.signals) : 0;
  const activeInputLoad = latestVisit ? calculateActiveInputLoad(latestVisit.signals) : 0;
  const interactionVelocityLoad = latestVisit ? calculateInteractionVelocityLoad(latestVisit.signals) : 0;
  const recommenderClickLoad = latestVisit ? calculateRecommenderClickLoad(latestVisit.signals) : 0;
  const constructiveDwell = latestVisit ? calculateConstructiveDwell(latestVisit.signals) : 0;
  const passiveTimeLoad = latestVisit ? calculatePassiveTimeLoad(latestVisit.signals) : 0;
  const latestActivity = latestVisit?.signals?.activity || {};
  const linkDensity = latestVisit ? calculateLinkDensity(latestVisit.signals) : 0;
  const domainEntropy = domains.length <= 1 ? 0 : clamp(uniqueDomains.size / domains.length, 0, 1);
  const branchCount = visits.filter(visit => visit.parentVisitId).length;
  const driftDescendantCount = visits.filter(visit => visit.driftDescendant).length;
  const redirectTransitionCount = visits.filter(hasRedirectTransition).length;
  const redirectTransitionLoad = calculateRedirectTransitionLoad(visits);
  const durationTotals = calculateDurationTotals(visits);

  return {
    visitCount: visits.length,
    uniqueDomainCount: uniqueDomains.size,
    tabCount: uniqueTabIds.size,
    branchCount,
    driftDescendantCount,
    latestIsDriftDescendant: latestVisit?.driftDescendant === true,
    domainChanges,
    originSimilarity: originSimilarityResult.similarity,
    localSimilarity: localSimilarityResult.similarity,
    metadataOriginSimilarity: originSimilarityResult.metadataSimilarity,
    metadataLocalSimilarity: localSimilarityResult.metadataSimilarity,
    textOriginSimilarity: originSimilarityResult.textSimilarity,
    textLocalSimilarity: localSimilarityResult.textSimilarity,
    passiveMediaLoad: Number(passiveMediaLoad.toFixed(3)),
    passiveInteractionLoad: Number(passiveInteractionLoad.toFixed(3)),
    activeInputLoad: Number(activeInputLoad.toFixed(3)),
    interactionVelocityLoad: Number(interactionVelocityLoad.toFixed(3)),
    recommenderClickLoad: Number(recommenderClickLoad.toFixed(3)),
    constructiveDwell: Number(constructiveDwell.toFixed(3)),
    passiveTimeLoad: Number(passiveTimeLoad.toFixed(3)),
    latestDwellMs: latestVisit ? getVisitDurationMs(latestVisit, 'pageAgeMs') : 0,
    latestActiveMs: latestVisit ? getVisitDurationMs(latestVisit, 'activePageMs') : 0,
    totalDwellMs: Math.round(durationTotals.dwellMs),
    totalActiveMs: Math.round(durationTotals.activeMs),
    scrollRatePerMinute: Number(Number(latestActivity.scrollRatePerMinute || 0).toFixed(3)),
    clickRatePerMinute: Number(Number(latestActivity.clickRatePerMinute || 0).toFixed(3)),
    recommenderClickEvents: Number(latestActivity.recommenderClickEvents || 0),
    recommenderClickRatePerMinute: Number(Number(latestActivity.recommenderClickRatePerMinute || 0).toFixed(3)),
    keyRatePerMinute: Number(Number(latestActivity.keyRatePerMinute || 0).toFixed(3)),
    inputRatePerMinute: Number(Number(latestActivity.inputRatePerMinute || 0).toFixed(3)),
    latestTransitionType: latestVisit?.transitionType || null,
    latestTransitionQualifiers: Array.isArray(latestVisit?.transitionQualifiers) ? latestVisit.transitionQualifiers : [],
    latestTransitionSource: latestVisit?.transitionSource || null,
    redirectTransitionCount,
    redirectTransitionLoad: Number(redirectTransitionLoad.toFixed(3)),
    linkDensity: Number(linkDensity.toFixed(3)),
    domainEntropy: Number(domainEntropy.toFixed(3))
  };
}

export function calculateIntentCoherence(metrics = {}) {
  const visitCount = Number(metrics.visitCount || 0);
  const originDrift = (1 - Number(metrics.originSimilarity ?? 1)) * 20;
  const localDrift = (1 - Number(metrics.localSimilarity ?? 1)) * 10;
  const entropyDrift = visitCount >= 3 ? Number(metrics.domainEntropy || 0) * 15 : 0;
  const passiveDrift = Number(metrics.passiveMediaLoad || 0) * 15;
  const passiveInteractionDrift = Number(metrics.passiveInteractionLoad || 0) * 10;
  const linkDrift = Number(metrics.linkDensity || 0) * 10;
  const domainChangeDrift = Math.min(Math.max(Number(metrics.domainChanges || 0) - 1, 0) * 3, 15);
  const tabBranchDrift = Math.min(Math.max(Number(metrics.tabCount || 0) - 3, 0) * 4, 12);
  const lineageDrift = Math.min(Number(metrics.branchCount || 0) * 1.5, 8);
  const driftDescendantDrift = metrics.latestIsDriftDescendant ? 8 : 0;
  const passiveTimeDrift = Number(metrics.passiveTimeLoad || 0) * 8;
  const interactionVelocityDrift = Number(metrics.interactionVelocityLoad || 0) * 8;
  const recommenderDrift = Number(metrics.recommenderClickLoad || 0) * 12;
  const redirectTransitionDrift = Number(metrics.redirectTransitionLoad || 0) * 5;
  const agencyRecovery = Number(metrics.activeInputLoad || 0) * 4;
  const dwellRecovery = Number(metrics.constructiveDwell || 0) * 4;

  return Math.round(clamp(
    100
      - originDrift
      - localDrift
      - entropyDrift
      - passiveDrift
      - passiveInteractionDrift
      - linkDrift
      - domainChangeDrift
      - tabBranchDrift
      - lineageDrift
      - driftDescendantDrift
      - passiveTimeDrift
      - interactionVelocityDrift
      - recommenderDrift
      - redirectTransitionDrift
      + agencyRecovery
      + dwellRecovery,
    0,
    100
  ));
}

function createVisit(signal, options, now) {
  return {
    id: `intent-visit-${now}-${Math.random().toString(36).slice(2, 8)}`,
    tabId: Number.isFinite(options.tabId) ? options.tabId : null,
    frameId: Number.isFinite(options.frameId) ? options.frameId : null,
    parentVisitId: options.parentVisitId || null,
    openerTabId: Number.isFinite(options.openerTabId) ? options.openerTabId : null,
    rootTabId: Number.isFinite(options.rootTabId) ? options.rootTabId : (Number.isFinite(options.tabId) ? options.tabId : null),
    driftDescendant: options.driftDescendant === true,
    transitionType: normalizeTransitionType(options.transitionType),
    transitionQualifiers: normalizeTransitionQualifiers(options.transitionQualifiers),
    transitionSource: normalizeString(options.transitionSource) || null,
    transitionUrl: normalizeString(options.transitionUrl) || null,
    transitionAt: normalizeString(options.transitionAt) || null,
    policy: {
      planIds: normalizeStringArray(options.planIds),
      planNames: normalizeStringArray(options.planNames),
      source: normalizeString(options.policySource) || null
    },
    url: signal.url,
    hostname: signal.hostname,
    title: signal.title,
    startedAt: new Date(now).toISOString(),
    dwellMs: signal.activity.pageAgeMs,
    activeMs: signal.activity.activePageMs,
    tokens: signal.tokens,
    metadataTokens: signal.metadataTokens,
    textTokens: signal.textTokens,
    signals: {
      text: signal.text,
      media: signal.media,
      interaction: signal.interaction,
      structure: signal.structure,
      activity: signal.activity
    },
    metrics: {
      originSimilarity: 1,
      localSimilarity: 1
    }
  };
}

function getSessionTimestamp(session = {}) {
  const lastActiveAt = Date.parse(session.lastActiveAt || '');
  if (Number.isFinite(lastActiveAt)) {
    return lastActiveAt;
  }

  const createdAt = Date.parse(session.createdAt || '');
  return Number.isFinite(createdAt) ? createdAt : 0;
}

function pruneSessionsByRetention(sessions = [], options = {}, now = Date.now()) {
  const retentionDays = normalizeIntentSettings(options.intentSettings).diagnosticsRetentionDays;
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoff = now - retentionMs;
  return sessions.filter(session => getSessionTimestamp(session) >= cutoff);
}

function updateSession(session, visit, options) {
  const visits = [...session.visits, visit].slice(-options.maxVisitsPerSession);
  const originVisit = {
    tokens: session.origin?.tokens || visits[0]?.tokens || [],
    metadataTokens: session.origin?.metadataTokens || visits[0]?.metadataTokens || session.origin?.tokens || [],
    textTokens: session.origin?.textTokens || visits[0]?.textTokens || []
  };
  const metrics = calculateSessionMetrics(visits, originVisit);
  const coherenceScore = calculateIntentCoherence(metrics);
  const riskState = getIntentRiskState(coherenceScore, options.intentSettings);
  const previousVisit = visits[visits.length - 2] || visit;

  visit.metrics = {
    originSimilarity: metrics.originSimilarity,
    localSimilarity: calculateVisitSimilarity(previousVisit, visit).similarity,
    textOriginSimilarity: metrics.textOriginSimilarity,
    textLocalSimilarity: metrics.textLocalSimilarity
  };

  return {
    ...session,
    lastActiveAt: visit.startedAt,
    visits,
    metrics,
    coherenceScore,
    riskState,
    lockedAt: session.lockedAt || (riskState === 'locked' ? visit.startedAt : null),
    driftDescendantAt: session.driftDescendantAt || (visit.driftDescendant ? visit.startedAt : null),
    firstDriftVisitId: session.firstDriftVisitId || (riskState === 'drift' || riskState === 'intervene' || riskState === 'locked'
      ? visit.id
      : null)
  };
}

function getLatestVisitForTab(session = {}, tabId = null) {
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const normalizedTabId = normalizeTabId(tabId);
  if (!Array.isArray(normalizedSession.visits) || !Number.isFinite(normalizedTabId)) {
    return null;
  }

  return [...normalizedSession.visits].reverse().find(visit => visit.tabId === normalizedTabId) || null;
}

function getExactIntentSessionForTab(state = {}, tabId = null) {
  const normalizedTabId = normalizeTabId(tabId);
  if (!Array.isArray(state.sessions) || !Number.isFinite(normalizedTabId)) {
    return null;
  }

  return [...state.sessions].reverse().find(session => {
    return Array.isArray(session.visits) && session.visits.some(visit => visit.tabId === normalizedTabId);
  }) || null;
}

function getLineageParentSession(state = {}, lineageEntry = null) {
  if (!lineageEntry?.parentSessionId || !Array.isArray(state.sessions)) {
    return null;
  }

  return state.sessions.find(session => session.id === lineageEntry.parentSessionId) || null;
}

function getMatchingTransitionForSignal(lineageEntry = null, signal = {}) {
  if (!lineageEntry?.transitionType) {
    return {};
  }

  const transitionUrl = normalizeComparableUrl(lineageEntry.transitionUrl);
  const signalUrl = normalizeComparableUrl(signal.url);
  if (transitionUrl && signalUrl && transitionUrl !== signalUrl) {
    return {};
  }

  return {
    transitionType: lineageEntry.transitionType,
    transitionQualifiers: lineageEntry.transitionQualifiers || [],
    transitionSource: lineageEntry.transitionSource || null,
    transitionUrl: lineageEntry.transitionUrl || null,
    transitionAt: lineageEntry.transitionAt || null
  };
}

export function recordIntentPageVisit(currentState, rawSignal, options = {}) {
  const normalizedOptions = {
    ...DEFAULT_INTENT_OPTIONS,
    ...options,
    intentSettings: normalizeIntentSettings(options.intentSettings || DEFAULT_INTENT_SETTINGS)
  };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const signal = normalizePageSignalForIntent(rawSignal, normalizedOptions);

  if (!signal.url && !signal.hostname) {
    return state;
  }

  const shouldIsolateTab = normalizedOptions.isolateTab === true && Number.isFinite(normalizedOptions.tabId);
  const tabLineageEntry = shouldIsolateTab ? null : getIntentTabLineageEntry(state, normalizedOptions.tabId);
  const exactTabSession = shouldIsolateTab ? null : getExactIntentSessionForTab(state, normalizedOptions.tabId);
  const lineageParentSession = shouldIsolateTab ? null : getLineageParentSession(state, tabLineageEntry);
  const activeSession = exactTabSession
    || lineageParentSession
    || state.sessions.find(session => session.id === state.activeSessionId)
    || state.sessions.at(-1);
  const lineageOptions = {
    ...normalizedOptions,
    parentVisitId: shouldIsolateTab ? null : normalizedOptions.parentVisitId || tabLineageEntry?.parentVisitId || null,
    openerTabId: shouldIsolateTab ? null : normalizedOptions.openerTabId ?? tabLineageEntry?.openerTabId ?? null,
    rootTabId: shouldIsolateTab ? normalizedOptions.tabId : normalizedOptions.rootTabId ?? tabLineageEntry?.rootTabId ?? normalizedOptions.tabId,
    ...(
      shouldIsolateTab
        ? {}
        : getMatchingTransitionForSignal(tabLineageEntry, signal)
    ),
    driftDescendant: shouldIsolateTab
      ? false
      : normalizedOptions.driftDescendant === true || tabLineageEntry?.driftDescendant === true
  };
  const visit = createVisit(signal, lineageOptions, now);
  let sessions;
  let activeSessionId;

  if (shouldIsolateTab || normalizedOptions.forceNewSession || shouldStartNewSession(state, activeSession, now, normalizedOptions)) {
    const session = createSession(signal, visit, now);
    sessions = [...state.sessions, session];
    activeSessionId = session.id;
  } else {
    const targetSessionId = activeSession.id;
    sessions = state.sessions.map(session => {
      if (session.id !== targetSessionId) {
        return session;
      }

      return updateSession(session, visit, normalizedOptions);
    });
    activeSessionId = targetSessionId;
  }

  sessions = pruneSessionsByRetention(sessions, normalizedOptions, now).slice(-normalizedOptions.maxSessions);

  return {
    ...state,
    activeTabId: Number.isFinite(normalizedOptions.tabId) ? normalizedOptions.tabId : state.activeTabId,
    activeSessionId,
    updatedAt: new Date(now).toISOString(),
    sessions,
    tabLineage: shouldIsolateTab
      ? state.tabLineage.filter(entry => entry.tabId !== normalizedOptions.tabId)
      : state.tabLineage
  };
}

export function recordIntentNavigationTransition(currentState, rawTransition = {}, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const transition = normalizeIntentNavigationTransition(rawTransition, normalizedOptions);

  if (!Number.isFinite(transition.tabId) || transition.frameId !== 0 || !transition.transitionType) {
    return state;
  }

  const existingLineage = getIntentTabLineageEntry(state, transition.tabId);
  const lineageEntry = normalizeTabLineageEntry({
    ...existingLineage,
    tabId: transition.tabId,
    rootTabId: existingLineage?.rootTabId ?? transition.tabId,
    transitionType: transition.transitionType,
    transitionQualifiers: transition.transitionQualifiers,
    transitionSource: transition.transitionSource,
    transitionUrl: transition.url,
    transitionAt: transition.transitionAt,
    createdAt: existingLineage?.createdAt || transition.transitionAt,
    updatedAt: transition.transitionAt
  });

  return {
    ...state,
    updatedAt: new Date(now).toISOString(),
    tabLineage: [
      ...state.tabLineage.filter(entry => entry.tabId !== transition.tabId),
      lineageEntry
    ].filter(Boolean).slice(-normalizedOptions.maxTabLineageEntries)
  };
}

export function recordIntentTabActivation(currentState, tabId, options = {}) {
  const now = getTimestamp({ ...DEFAULT_INTENT_OPTIONS, ...options });
  const state = normalizeIntentState(currentState, now, { ...DEFAULT_INTENT_OPTIONS, ...options });

  return {
    ...state,
    activeTabId: Number.isFinite(normalizeTabId(tabId)) ? normalizeTabId(tabId) : state.activeTabId,
    updatedAt: new Date(now).toISOString()
  };
}

function isVisitAtOrAfterDriftPoint(session = {}, visit = null) {
  if (!session?.firstDriftVisitId || !visit?.id || !Array.isArray(session.visits)) {
    return false;
  }

  const driftIndex = session.visits.findIndex(candidate => candidate.id === session.firstDriftVisitId);
  const visitIndex = session.visits.findIndex(candidate => candidate.id === visit.id);
  return driftIndex >= 0 && visitIndex >= driftIndex;
}

export function recordIntentTabCreated(currentState, tab = {}, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const tabId = normalizeTabId(tab.tabId ?? tab.id);
  const openerTabId = normalizeTabId(tab.openerTabId);

  if (!Number.isFinite(tabId)) {
    return state;
  }

  const openerLineage = getIntentTabLineageEntry(state, openerTabId);
  const parentSession = getExactIntentSessionForTab(state, openerTabId) || getLineageParentSession(state, openerLineage);
  const parentVisit = getLatestVisitForTab(parentSession, openerTabId)
    || (Array.isArray(parentSession?.visits) ? parentSession.visits.at(-1) : null);
  const rootTabId = Number.isFinite(openerLineage?.rootTabId)
    ? openerLineage.rootTabId
    : (Number.isFinite(openerTabId) ? openerTabId : tabId);
  const lineageEntry = normalizeTabLineageEntry({
    tabId,
    openerTabId,
    rootTabId,
    parentSessionId: parentSession?.id || null,
    parentVisitId: parentVisit?.id || null,
    driftDescendant: Boolean(
      openerLineage?.driftDescendant
        || parentSession?.riskState === 'drift'
        || parentSession?.riskState === 'intervene'
        || parentSession?.riskState === 'locked'
        || isVisitAtOrAfterDriftPoint(parentSession, parentVisit)
    ),
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString()
  });

  const nextLineage = [
    ...state.tabLineage.filter(entry => entry.tabId !== tabId),
    lineageEntry
  ].filter(Boolean).slice(-normalizedOptions.maxTabLineageEntries);

  return {
    ...state,
    activeTabId: tab.active === true ? tabId : state.activeTabId,
    updatedAt: new Date(now).toISOString(),
    tabLineage: nextLineage
  };
}

export function recordIntentTabRemoved(currentState, tabId, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const normalizedTabId = normalizeTabId(tabId);

  if (!Number.isFinite(normalizedTabId)) {
    return state;
  }

  return {
    ...state,
    activeTabId: state.activeTabId === normalizedTabId ? null : state.activeTabId,
    updatedAt: new Date(now).toISOString(),
    tabLineage: state.tabLineage.filter(entry => entry.tabId !== normalizedTabId)
  };
}

export function getActiveIntentSession(state = {}) {
  if (!Array.isArray(state.sessions)) {
    return null;
  }

  return state.sessions.find(session => session.id === state.activeSessionId) || state.sessions.at(-1) || null;
}

export function getIntentSessionForTab(state = {}, tabId = null) {
  const normalizedTabId = normalizeTabId(tabId);
  if (!Array.isArray(state.sessions) || !Number.isFinite(normalizedTabId)) {
    return getActiveIntentSession(state);
  }

  const exactSession = getExactIntentSessionForTab(state, normalizedTabId);
  if (exactSession) {
    return exactSession;
  }

  const lineageParentSession = getLineageParentSession(state, getIntentTabLineageEntry(state, normalizedTabId));
  return lineageParentSession || getActiveIntentSession(state);
}

export function recordIntentFeedback(currentState, rawFeedback = {}, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const state = normalizeIntentState(currentState, now, normalizedOptions);
  const tabId = normalizeTabId(rawFeedback.tabId ?? normalizedOptions.tabId);
  const activeSession = getIntentSessionForTab(state, tabId);
  const latestVisit = getLatestVisitForTab(activeSession, tabId)
    || (Array.isArray(activeSession?.visits) ? activeSession.visits.at(-1) : null);
  const recoveryHostname = getHostnameFromUrl(rawFeedback.recoveryUrl)
    || getHostnameFromUrl(rawFeedback.recoveryVisit?.url)
    || normalizeString(rawFeedback.recoveryVisit?.hostname);
  const currentHostname = normalizeString(rawFeedback.currentVisit?.hostname)
    || normalizeString(latestVisit?.hostname)
    || getHostnameFromUrl(rawFeedback.currentVisit?.url);
  const entry = normalizeIntentFeedbackEntry({
    id: `intent-feedback-${now}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: new Date(now).toISOString(),
    action: rawFeedback.action,
    interventionId: rawFeedback.interventionId,
    sessionId: rawFeedback.sessionId || activeSession?.id,
    visitId: rawFeedback.visitId || rawFeedback.currentVisit?.id || latestVisit?.id,
    tabId,
    riskState: rawFeedback.riskState || activeSession?.riskState,
    coherenceScore: rawFeedback.coherenceScore ?? activeSession?.coherenceScore,
    policyAction: rawFeedback.policyAction || rawFeedback.decisionAction,
    currentHostname,
    recoveryHostname
  });

  return {
    ...state,
    updatedAt: new Date(now).toISOString(),
    feedback: [...state.feedback, entry].slice(-normalizedOptions.maxFeedbackEntries)
  };
}

export function getLastCoherentIntentVisit(session = {}) {
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const visits = Array.isArray(normalizedSession.visits) ? normalizedSession.visits : [];
  if (visits.length === 0) {
    return null;
  }

  const driftIndex = normalizedSession.firstDriftVisitId
    ? visits.findIndex(visit => visit.id === normalizedSession.firstDriftVisitId)
    : -1;

  if (driftIndex > 0) {
    return visits[driftIndex - 1];
  }

  return visits[0];
}

export function createIntentInterventionId(session = {}) {
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const visits = Array.isArray(normalizedSession.visits) ? normalizedSession.visits : [];
  const latestVisit = visits[visits.length - 1];
  return [
    normalizedSession.id || 'intent-session',
    normalizedSession.riskState || 'unknown',
    normalizedSession.firstDriftVisitId || latestVisit?.id || 'no-visit'
  ].join(':');
}

export function getIntentReasonLines(session = {}) {
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const metrics = normalizedSession.metrics || {};
  const reasons = [];

  if (Number(metrics.originSimilarity ?? 1) < 0.35) {
    reasons.push('Low overlap with the session origin');
  }

  if (metrics.textOriginSimilarity !== null && Number(metrics.textOriginSimilarity ?? 1) < 0.25) {
    reasons.push('Low visible-text topic overlap with the origin');
  }

  if (Number(metrics.localSimilarity ?? 1) < 0.35) {
    reasons.push('Abrupt shift from the previous page');
  }

  if (Number(metrics.passiveMediaLoad || 0) >= 0.55) {
    reasons.push('High media or feed pressure');
  }

  if (Number(metrics.domainEntropy || 0) >= 0.6 && Number(metrics.visitCount || 0) >= 3) {
    reasons.push('Fragmented across several domains');
  }

  if (Number(metrics.domainChanges || 0) >= 3) {
    reasons.push('Repeated domain switching');
  }

  if (Number(metrics.tabCount || 0) >= 4) {
    reasons.push('Session branched across several tabs');
  }

  if (Number(metrics.branchCount || 0) >= 3) {
    reasons.push('Repeated child-tab branching');
  }

  if (metrics.latestIsDriftDescendant === true) {
    reasons.push('Current tab descends from an already drifted chain');
  }

  if (Number(metrics.linkDensity || 0) >= 0.45) {
    reasons.push('Very link-dense page');
  }

  if (Number(metrics.passiveInteractionLoad || 0) >= 0.55) {
    reasons.push('High passive scroll or click pressure');
  }

  if (Number(metrics.interactionVelocityLoad || 0) >= 0.55) {
    reasons.push('High interaction velocity');
  }

  if (Number(metrics.recommenderClickLoad || 0) >= 0.55) {
    reasons.push('Recommendation or feed clicks are driving the chain');
  }

  if (Number(metrics.redirectTransitionLoad || 0) >= 0.55) {
    reasons.push('Redirect-heavy navigation chain');
  }

  if (Number(metrics.passiveTimeLoad || 0) >= 0.55) {
    reasons.push('Sustained active time on a passive page');
  }

  return reasons.length > 0 ? reasons : ['Coherence score crossed the intervention threshold'];
}

export function getIntentInterventionDecision(session = {}, options = {}) {
  const normalizedOptions = { ...DEFAULT_INTENT_OPTIONS, ...options };
  const now = getTimestamp(normalizedOptions);
  const normalizedSession = session && typeof session === 'object' ? session : {};
  const rawSettings = options.intentSettings || DEFAULT_INTENT_SETTINGS;
  const settings = {
    ...normalizeIntentSettings(rawSettings),
    calibration: rawSettings.calibration || null
  };
  const visits = Array.isArray(normalizedSession.visits) ? normalizedSession.visits : [];
  const latestVisit = visits[visits.length - 1] || null;
  const driftVisit = normalizedSession.firstDriftVisitId
    ? visits.find(visit => visit.id === normalizedSession.firstDriftVisitId) || null
    : null;
  const recoveryVisit = getLastCoherentIntentVisit(normalizedSession);
  const riskStates = Array.isArray(options.riskStates) && options.riskStates.length > 0
    ? options.riskStates
    : INTENT_INTERVENTION_RISK_STATES;
  const riskState = Number.isFinite(normalizedSession.coherenceScore)
    ? getIntentRiskState(normalizedSession.coherenceScore, settings)
    : String(normalizedSession.riskState || 'clear');
  const shouldIntervene = Boolean(
    settings.enabled
      && latestVisit
      && recoveryVisit
      && riskStates.includes(riskState)
      && latestVisit.url
      && recoveryVisit.url
      && latestVisit.url !== recoveryVisit.url
  );
  const chainBlockActive = Boolean(
    shouldIntervene
      && settings.action === INTENT_INTERVENTION_ACTIONS.BLOCK
      && (riskState === 'locked' || latestVisit?.driftDescendant === true)
  );
  const chainBlockMode = chainBlockActive
    ? (latestVisit?.driftDescendant === true ? 'driftDescendant' : 'lockedChain')
    : 'none';
  const chainBlockReason = chainBlockMode === 'driftDescendant'
    ? 'Current tab descends from a drifted chain'
    : (chainBlockMode === 'lockedChain' ? 'Session crossed the locked threshold' : '');
  const chainBlockStartedAtMs = chainBlockMode === 'driftDescendant'
    ? parseTimestamp(normalizedSession.driftDescendantAt) ?? parseTimestamp(latestVisit?.startedAt) ?? now
    : (chainBlockMode === 'lockedChain'
        ? parseTimestamp(normalizedSession.lockedAt) ?? parseTimestamp(latestVisit?.startedAt) ?? now
        : null);
  const chainBlockCooldownMs = chainBlockActive
    ? clampNumber(normalizedOptions.chainBlockCooldownMs, DEFAULT_INTENT_CHAIN_BLOCK_COOLDOWN_MS, 0, 10 * 60 * 1000)
    : 0;
  const cooldownEndsAtMs = chainBlockActive && chainBlockStartedAtMs !== null
    ? chainBlockStartedAtMs + chainBlockCooldownMs
    : null;
  const cooldownRemainingMs = cooldownEndsAtMs === null ? 0 : Math.max(0, cooldownEndsAtMs - now);
  const reasonLines = getIntentReasonLines(session);
  const decisionReasonLines = chainBlockActive && !reasonLines.includes(chainBlockReason)
    ? [chainBlockReason, ...reasonLines]
    : reasonLines;

  return {
    shouldIntervene,
    interventionId: createIntentInterventionId(normalizedSession),
    sessionId: normalizedSession.id || null,
    riskState,
    action: settings.action,
    settings,
    coherenceScore: Number.isFinite(normalizedSession.coherenceScore) ? normalizedSession.coherenceScore : null,
    origin: normalizedSession.origin || null,
    currentVisit: latestVisit,
    driftVisit,
    recoveryVisit,
    recoveryUrl: recoveryVisit?.url || '',
    hardBlocked: chainBlockActive,
    chainBlock: {
      active: chainBlockActive,
      mode: chainBlockMode,
      reason: chainBlockReason,
      firstDriftVisitId: normalizedSession.firstDriftVisitId || null,
      driftVisitId: driftVisit?.id || null,
      currentVisitId: latestVisit?.id || null,
      recoveryVisitId: recoveryVisit?.id || null,
      driftDescendant: latestVisit?.driftDescendant === true,
      startedAt: chainBlockStartedAtMs === null ? null : new Date(chainBlockStartedAtMs).toISOString(),
      cooldownMs: chainBlockCooldownMs,
      cooldownEndsAt: cooldownEndsAtMs === null ? null : new Date(cooldownEndsAtMs).toISOString(),
      cooldownRemainingMs,
      cooldownActive: cooldownRemainingMs > 0
    },
    reasonLines: decisionReasonLines
  };
}
