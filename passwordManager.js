import './cipher-core.js';
import CryptoJS from './core.js';

// Function to encrypt the password
function encryptPassword(password) {
    let encryptedPassword = CryptoJS.AES.encrypt(password, 'your-secret-key').toString();
    return encryptedPassword;
}

// Function to decrypt the password using AES
function decryptPassword(encryptedPassword) {
    let bytes = CryptoJS.AES.decrypt(encryptedPassword, 'your-secret-key');
    let password = bytes.toString(CryptoJS.enc.Utf8);
    return password;
}


// Function to set the password
function setPassword(password) {
    let encryptedPassword = encryptPassword(password);
    chrome.storage.sync.set({password: encryptedPassword}, function() {
        console.log('Password is set.');
        updateButtonStates(); // Update UI state
    });
}

// Function to edit the password
function editPassword(oldPassword, newPassword) {
    verifyPassword(oldPassword, function(isMatch) {
        if (isMatch) {
            setPassword(newPassword);
        } else {
            console.log('Old password is incorrect.');
        }
    });
}

// Function to delete the password
function deletePassword() {
    chrome.storage.sync.remove('password', function() {
        console.log('Password is removed.');
        updateButtonStates(); // Update UI state
    });
}

// Function to verify the password
function verifyPassword(inputPassword, callback) {
    chrome.storage.sync.get('password', function(data) {
        let storedPassword = decryptPassword(data.password);
        callback(inputPassword === storedPassword);
    });
}

// Utility functions
function showPasswordOverlay() {
    // Code to show password overlay
    document.getElementById('passwordOverlay').style.display = 'block';
}

function hidePasswordOverlay() {
    // Code to hide password overlay
    document.getElementById('passwordOverlay').style.display = 'none';
}


function confirmPassword() {
    const password = document.getElementById('passwordInputField').value;
    const confirmPassword = document.getElementById('confirmPasswordInputField').value;
    if (password === confirmPassword) {
        setPassword(password);
    } else {
        console.log('Passwords do not match.');
    }
}

// New function to update button states
function updateButtonStates() {
    chrome.storage.sync.get('password', function(data) {
        const hasPassword = !!data.password;
        document.getElementById('editPasswordButton').disabled = !hasPassword;
        document.getElementById('deletePasswordButton').disabled = !hasPassword;
        document.getElementById('setPasswordButton').style.display = hasPassword ? 'none' : 'inline-block';
        document.getElementById('passwordInputField').style.display = hasPassword ? 'none' : 'inline-block';

        // Update button classes for styling
        const editButton = document.getElementById('editPasswordButton');
        const deleteButton = document.getElementById('deletePasswordButton');
        editButton.className = hasPassword ? 'enabled' : 'disabled';
        deleteButton.className = hasPassword ? 'enabled' : 'disabled';
    });
}

// Call updateButtonStates on page load
document.addEventListener('DOMContentLoaded', updateButtonStates);

document.getElementById('setPasswordButton').addEventListener('click', confirmPassword);



// Export the functions if using modules
export {
    setPassword,
    editPassword,
    deletePassword,
    verifyPassword,
    showPasswordOverlay,
    hidePasswordOverlay,
    updateButtonStates
};
