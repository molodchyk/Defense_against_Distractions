/**
 * keywordManager.js
 * This module handles operations related to managing the blocked keywords for the Chrome extension.
 * It includes functions to add, remove, and validate keywords, ensuring no duplicates and maintaining the keyword list.
 */

const KeywordManager = {
    addKeyword: function(keywords, keywordToAdd) {
        const lowerCaseKeywordToAdd = keywordToAdd.toLowerCase();
        if (!keywords.map(k => k.toLowerCase()).includes(lowerCaseKeywordToAdd)) {
            return [...keywords, lowerCaseKeywordToAdd];
        }
        return keywords; // Return original list if keyword already exists
    },

    removeKeyword: function(keywords, keywordToRemove) {
        return keywords.filter(k => k.toLowerCase() !== keywordToRemove.toLowerCase());
    },

    // Additional utility functions can be added here as needed
};