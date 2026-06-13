// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import { getSync } from './shared/storage/chromeStorage.js';
import {
    DEFAULT_THEME_MODE,
    THEME_STORAGE_KEY,
    normalizeThemeMode,
    resolveThemeMode
} from './shared/ui/theme.js';
import {
    applyUiLanguageAttributes,
    getUiMessage,
    initializeUiLanguage
} from './shared/ui/uiLanguage.js';

const THEME_QUERY = '(prefers-color-scheme: dark)';

function applyThemeMode(mode) {
    const resolvedThemeMode = resolveThemeMode(mode, window.matchMedia(THEME_QUERY).matches);
    document.documentElement.dataset.theme = resolvedThemeMode;
    document.documentElement.dataset.themeMode = normalizeThemeMode(mode);
}

async function initializeThemeMode() {
    try {
        const result = await getSync({ [THEME_STORAGE_KEY]: DEFAULT_THEME_MODE });
        const themeMode = normalizeThemeMode(result[THEME_STORAGE_KEY]);
        applyThemeMode(themeMode);

        window.matchMedia(THEME_QUERY).addEventListener('change', () => {
            applyThemeMode(themeMode);
        });
    } catch (error) {
        console.error('Failed to load UI theme mode:', error);
        applyThemeMode(DEFAULT_THEME_MODE);
    }
}

// Function to localize content based on ID
function localizeContent() {
    applyUiLanguageAttributes();

    const ids = [
        "pageTitle", "headerTitle",
        "introTitle", "introText1", "introText2", "introText3", "introText4",
        "howToUseTitle",
        "createGroupTitle", "createGroupText1", "createGroupText2",
        "websitesTitle", "websitesText",
        "keywordsTitle", "keywordsText1", "keywordFormatsIntroduction", "keywordFormat1Title", "keywordFormat1Text", "keywordFormat1_2",
        "keywordFormat2Title", "keywordFormat2Text", "keywordFormat2_2", "keywordFormat2_3", "keywordFormat3Title", "keywordFormat3Text", "keywordFormat3_2", "keywordFormat3_3",
        "timerCountTitle", "timerCountText",
        "timerDurationTitle", "timerDurationText",
        "lockedSchedulesTitle", "lockedSchedulesNote", "lockedSchedulesText1", "lockedSchedulesText2", "lockedSchedulesText3", "lockedSchedulesText4",
        "lockedScheduleRestriction1", "lockedScheduleRestriction2", "lockedScheduleRestriction3",
        "lockedScheduleRestriction4", "lockedScheduleRestriction5", "lockedScheduleRestriction6",
        "lockedScheduleRestriction7", "lockedScheduleRestriction8", "lockedScheduleRestriction9", "lockedScheduleRestriction10",
        "whitelistWebsitesTitle", "whitelistWebsitesText",
        "passwordManagementTitle", "passwordManagementText",
        "contactFeedbackTitle", "feedbackText1", "githubLink", "feedbackText2", "thanks"
    ];

    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = getUiMessage(id, element.textContent || id);
        }
    });
}

// Execute the localization function when the document is loaded
document.addEventListener('DOMContentLoaded', async () => {
    initializeThemeMode();
    await initializeUiLanguage();
    localizeContent();
});
