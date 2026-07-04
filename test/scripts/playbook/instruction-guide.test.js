// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { getInstructionGuideFailures } from '../../../scripts/playbook/instructionGuide.mjs';

const CURRENT_MODEL_FAILURE = 'Instruction guide must describe the current plan-based protection model, local processing boundary, allowed websites, Pomodoro, intent coherence, UI cleanup, and protected-schedule strictness.';
const RETIRED_GUIDE_FAILURE = 'Instruction guide must not use retired group, whitelist, or old timer wording as primary user guidance.';
const ABOUT_MODEL_FAILURE = 'ABOUT.md must describe the current plan-based, local-first product model including allowed websites, Pomodoro, intent coherence, UI cleanup, and no remote server for core blocking.';
const RETIRED_ABOUT_FAILURE = 'ABOUT.md must not use retired group, whitelist, or old timer wording as primary product guidance.';

async function readInstructionGuideDocs() {
  const [about, instructionsHtml, englishMessagesText] = await Promise.all([
    readFile('ABOUT.md', 'utf8'),
    readFile('src/instructions.html', 'utf8'),
    readFile('_locales/en/messages.json', 'utf8')
  ]);

  return {
    about,
    englishMessages: JSON.parse(englishMessagesText),
    instructionsHtml
  };
}

describe('instruction guide checks', () => {
  it('accepts the current plan-based instruction guide and about page', async () => {
    assert.deepEqual(getInstructionGuideFailures(await readInstructionGuideDocs()), []);
  });

  it('rejects instruction guide copy that reintroduces retired group wording', async () => {
    const docs = await readInstructionGuideDocs();
    const staleInstructionsHtml = docs.instructionsHtml.replace(
      '</section>',
      '<p>Create a Group from the old group panel.</p></section>'
    );

    assert.deepEqual(getInstructionGuideFailures({
      ...docs,
      instructionsHtml: staleInstructionsHtml
    }), [RETIRED_GUIDE_FAILURE]);
  });

  it('rejects instruction guide copy that loses the local processing boundary', async () => {
    const docs = await readInstructionGuideDocs();
    const weakenedMessages = {
      ...docs.englishMessages,
      introText3: {
        ...docs.englishMessages.introText3,
        message: 'The extension checks configured pages.'
      }
    };
    const weakenedInstructionsHtml = docs.instructionsHtml.replace(
      'The extension checks configured pages locally in the browser.',
      'The extension checks configured pages.'
    );

    assert.deepEqual(getInstructionGuideFailures({
      ...docs,
      englishMessages: weakenedMessages,
      instructionsHtml: weakenedInstructionsHtml
    }), [CURRENT_MODEL_FAILURE]);
  });

  it('rejects ABOUT copy that loses the local-first browser-defense model', async () => {
    const docs = await readInstructionGuideDocs();
    const weakenedAbout = docs.about
      .replace('The project is local-first.', 'The project is flexible.')
      .replace('without a remote server for core blocking behavior', 'with whatever infrastructure is useful')
      .replace('It is a browser defense layer:', 'It is a productivity helper:');

    assert.deepEqual(getInstructionGuideFailures({
      ...docs,
      about: weakenedAbout
    }), [ABOUT_MODEL_FAILURE]);
  });

  it('rejects ABOUT copy that reintroduces retired whitelist wording', async () => {
    const docs = await readInstructionGuideDocs();
    const staleAbout = `${docs.about}\n\nOld wording: Whitelisted websites from the group panel.`;

    assert.deepEqual(getInstructionGuideFailures({
      ...docs,
      about: staleAbout
    }), [RETIRED_ABOUT_FAILURE]);
  });
});
