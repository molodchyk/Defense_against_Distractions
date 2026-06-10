// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

export function getHostnameLabel(visitOrOrigin) {
  if (!visitOrOrigin) {
    return '--';
  }

  const hostname = String(visitOrOrigin.hostname || '').replace(/^www\./i, '');
  const title = String(visitOrOrigin.title || '').trim();

  if (hostname && title) {
    return `${hostname} - ${title}`;
  }

  return title || hostname || '--';
}

export function formatClock(value) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) {
    return '--';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function formatShortDuration(value) {
  const totalSeconds = Math.max(0, Math.round(Number(value || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
}

export function getBreakDurationMs(phase, settings = {}, completedWorkSessions = 0) {
  const shortBreakMinutes = Number(settings.shortBreakMinutes || 0);
  const longBreakMinutes = Number(settings.longBreakMinutes || 0);
  const sessionsBeforeLongBreak = Math.max(1, Number(settings.sessionsBeforeLongBreak || 1));

  if (phase === 'longBreak') {
    return longBreakMinutes * 60 * 1000;
  }

  if (phase === 'shortBreak') {
    return shortBreakMinutes * 60 * 1000;
  }

  const nextCompletedCount = completedWorkSessions + 1;
  return nextCompletedCount % sessionsBeforeLongBreak === 0
    ? longBreakMinutes * 60 * 1000
    : shortBreakMinutes * 60 * 1000;
}

export function formatCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '--';
  }

  return new Intl.NumberFormat().format(Math.max(0, Math.round(number)));
}
