// Function to update the UI for blocked keywords
function updateKeywordUI(blockedKeywords) {
  const list = document.getElementById('keywordList');
  list.innerHTML = '';
  blockedKeywords.forEach((keyword, index) => {
    const li = document.createElement('li');
    li.textContent = keyword;
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => removeKeyword(index);
    li.appendChild(deleteButton);
    list.appendChild(li);
  });
}

function addKeyword() {
  const input = document.getElementById('keywordInput');
  const keyword = input.value.trim().toLowerCase(); // Standardize the input to lower case
  if (!keyword) return; // Don't add if the input is empty

  chrome.storage.sync.get('blockedKeywords', ({ blockedKeywords }) => {
    if (blockedKeywords.map(k => k.toLowerCase()).includes(keyword)) {
      alert("This keyword already exists.");
      input.value = ''; // Clear the input field
      return;
    }

    const updatedKeywords = [...blockedKeywords, keyword];
    chrome.storage.sync.set({ blockedKeywords: updatedKeywords }, () => {
      updateKeywordUI(updatedKeywords);
      input.value = ''; // Clear the input field after adding
    });
  });
}

function removeKeyword(index) {
  chrome.storage.sync.get('blockedKeywords', ({ blockedKeywords }) => {
    blockedKeywords.splice(index, 1);
    chrome.storage.sync.set({ blockedKeywords }, () => updateKeywordUI(blockedKeywords));
  });
}

// Event listeners for keyword management
document.addEventListener('DOMContentLoaded', () => {
    // Initialize keyword list
    chrome.storage.sync.get('blockedKeywords', ({ blockedKeywords = [] }) => {
      updateKeywordUI(blockedKeywords);
    });
  
    // Add keyword functionality
    document.getElementById('addButton').addEventListener('click', addKeyword);
    document.getElementById('keywordInput').addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        addKeyword();
      }
    });
});