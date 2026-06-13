// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

(function(global) {
  global.DAD = global.DAD || {};
  const intent = global.DAD.IntentIntervention = global.DAD.IntentIntervention || {};
  const {
    GRAYSCALE_ACTION,
    GRAYSCALE_ATTRIBUTE,
    REDUCE_NOISE_ACTION
  } = intent.constants;
  const { installStyle } = intent.style;
  const { applyElementReduction = () => {}, clearElementReduction = () => {} } = intent.elementReduction || {};
  const { applyNewTabFreeze = () => {}, clearNewTabFreeze = () => {} } = intent.newTabFreeze || {};

  function applyGrayscaleIntervention() {
    installStyle();
    global.document.documentElement.setAttribute(GRAYSCALE_ATTRIBUTE, 'true');
  }

  function clearGrayscaleIntervention() {
    global.document.documentElement.removeAttribute(GRAYSCALE_ATTRIBUTE);
  }

  function applyVisualIntervention(decision = {}) {
    if (decision.action === GRAYSCALE_ACTION) {
      applyGrayscaleIntervention();
    } else {
      clearGrayscaleIntervention();
    }

    if (decision.action === REDUCE_NOISE_ACTION) {
      installStyle();
      applyElementReduction();
    } else {
      clearElementReduction();
    }

    if (decision.freezeNewTabs) {
      applyNewTabFreeze(decision);
    } else {
      clearNewTabFreeze();
    }
  }

  function clearVisualInterventions() {
    clearGrayscaleIntervention();
    clearElementReduction();
    clearNewTabFreeze();
  }

  intent.effects = {
    applyVisualIntervention,
    clearVisualInterventions
  };
})(window);
