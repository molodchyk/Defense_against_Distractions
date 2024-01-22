/*
 * Defense Against Distractions Extension
 *
 * file: localization.js
 * 
 * This file is part of the Defense Against Distractions Extension.
 *
 * Defense Against Distractions Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Defense Against Distractions Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Defense Against Distractions Extension. If not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Oleksandr Molodchyk
 * Copyright (C) 2023 Oleksandr Molodchyk
 */

// Function to localize content based on ID
function localizeContent() {
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
            element.textContent = chrome.i18n.getMessage(id);
        }
    });
}

// Execute the localization function when the document is loaded
document.addEventListener('DOMContentLoaded', localizeContent);
