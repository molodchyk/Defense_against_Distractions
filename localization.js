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
