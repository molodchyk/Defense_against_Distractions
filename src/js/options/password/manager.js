// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

import {
    decryptPassword,
    encryptPassword,
    exportKeyToBase64,
    generatePasswordKey,
    importPasswordKey
} from './crypto.js';
import { isInProtectedSchedule } from '../../shared/plans.js';
import { getUiMessage } from '../../shared/ui/uiLanguage.js';
import { getLocal, getSync, removeSync, setLocal, setSync } from '../../../platform/chrome/storage.js';

const MAX_ATTEMPTS = 5;
const LOCKOUT_INTERVAL = 30 * 1000; // 30 seconds
let isPasswordManagerInitialized = false;
const PASSWORD_MESSAGES = {
    tooManyAttempts: 'Too many attempts. Please try again in $1 seconds.',
    incorrectPassword: 'Incorrect password. $1 attempts left.',
    passwordMismatchAlert: 'Passwords do not match.'
};

async function setPassword(password) {
    try {
        const key = await generatePasswordKey();
        const keyBase64 = await exportKeyToBase64(key);

        try {
            await setLocal({ key: keyBase64 });
        } catch (error) {
            console.error("Error storing the key:", error);
            return;
        }

        const encryptedPasswordBase64 = await encryptPassword(password, key);

        try {
            await setSync({ password: encryptedPasswordBase64 });
            updateButtonStates();
        } catch (error) {
            console.error("Error storing the password:", error);
            alert("Error storing the password");
        }
    } catch (error) {
        console.error("Error setting the password:", error);
    }
}




// Function to edit the password
function editPassword(oldPassword, newPassword) {
    verifyPassword(oldPassword, function(isMatch) {
        if (isMatch) {
            setPassword(newPassword);
        }
    });
}

// Function to delete the password
async function deletePassword() {
    try {
        await removeSync('password');
        updateButtonStates();
    } catch (error) {
        console.error('Error deleting password:', error);
    }
}


async function verifyPassword(inputPassword, callback) {
    const attemptData = await getAttemptData();
    const currentTime = new Date().getTime();
    const timeSinceLastAttempt = currentTime - attemptData.lastAttempt;
    const timeRemaining = LOCKOUT_INTERVAL - timeSinceLastAttempt;


    // Check if the lockout period is active
    if (attemptData.attempts >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_INTERVAL) {
        const timeRemainingAlert = getPasswordMessage("tooManyAttempts", [Math.ceil(timeRemaining / 1000).toString()]);
        alert(timeRemainingAlert);

        if (timeSinceLastAttempt >= LOCKOUT_INTERVAL) {
            await updateAttemptData(0); // Reset attempts after lockout duration
        }
        return;
    }

    // Reset attempts if the lockout interval has passed
    if (timeSinceLastAttempt >= LOCKOUT_INTERVAL) {
        await updateAttemptData(0);
        attemptData.attempts = 0; // Update local copy of attempts
    }


    try {
        const keyData = await getLocal('key');
        if (!keyData.key) {
            console.error('Error retrieving the key:', new Error('Missing password key.'));
            callback(false);
            return;
        }

        const key = await importPasswordKey(keyData.key);
        if (!key) {
            callback(false);
            return;
        }

        const passwordData = await getSync('password');
        if (!passwordData.password) {
            console.error('Error retrieving the password:', new Error('Missing password.'));
            callback(false);
            return;
        }

        const encryptedPasswordBase64 = passwordData.password;

        if (typeof encryptedPasswordBase64 !== 'string') {
            console.error('Expected a Base64 string, got:', typeof encryptedPasswordBase64);
            callback(false);
            return;
        }

        try {
            const decryptedPassword = await decryptPassword(encryptedPasswordBase64, key);

            if (decryptedPassword === null || inputPassword !== decryptedPassword) {
                await updateAttemptData(attemptData.attempts + 1);
                const attemptsLeftAlert = getPasswordMessage("incorrectPassword", [(MAX_ATTEMPTS - attemptData.attempts).toString()]);
                alert(attemptsLeftAlert);

                callback(false);
                return;
            }

            await updateAttemptData(0);
            callback(inputPassword === decryptedPassword);
        } catch (decryptError) {
            console.error('Error decrypting the password:', decryptError);
            callback(false);
        }
    } catch (error) {
        console.error("Error verifying the password:", error);
        callback(false);
    }
}



// Function to get attempt data from storage
async function getAttemptData() {
    try {
        const data = await getLocal(['attempts', 'lastAttempt']);
        return {
            attempts: data.attempts || 0,
            lastAttempt: data.lastAttempt || 0
        };
    } catch (error) {
        console.error('Error retrieving password attempt data:', error);
        return {
            attempts: 0,
            lastAttempt: 0
        };
    }
}

// Function to update attempt data in storage
async function updateAttemptData(attempts) {
    const data = {
        attempts: attempts,
        lastAttempt: new Date().getTime()
    };
    try {
        await setLocal(data);
    } catch (error) {
        console.error('Error updating password attempt data:', error);
    }
}




// Utility functions
function showPasswordOverlay() {
    // Code to show password overlay
    document.getElementById('passwordOverlay').style.display = 'flex';
}

function hidePasswordOverlay() {
    // Code to hide password overlay
    document.getElementById('passwordOverlay').style.display = 'none';
}


async function confirmPassword() {
    const password = document.getElementById('passwordInputField').value;
    const confirmPassword = document.getElementById('confirmPasswordInputField').value;
    if (password === confirmPassword) {
        await setPassword(password); // This is now an async call
    }
    else {
        alert(getPasswordMessage("passwordMismatchAlert"));
    }
}

async function validateOverlayPassword() {
    const overlayPassword = document.getElementById('passwordInput').value;
    await verifyPassword(overlayPassword, function(isMatch) {
        if (isMatch) {
            hidePasswordOverlay();
        }
    });
}


export async function updateButtonStates() {
    try {
        const data = await getSync(null);
        const hasPassword = !!data.password;

        if (isInProtectedSchedule(data)) {
            document.getElementById('deletePasswordButton').disabled = true;
            document.getElementById('setPasswordButton').disabled = true;
            document.getElementById('passwordInputField').disabled = true;
            document.getElementById('confirmPasswordInputField').disabled = true;

            const deleteButton = document.getElementById('deletePasswordButton');
            deleteButton.className = 'disabled';
            return;
        }

        document.getElementById('deletePasswordButton').disabled = !hasPassword;
        document.getElementById('setPasswordButton').disabled = hasPassword;
        document.getElementById('passwordInputField').disabled = hasPassword;
        document.getElementById('confirmPasswordInputField').disabled = hasPassword;

        const deleteButton = document.getElementById('deletePasswordButton');
        deleteButton.className = hasPassword ? 'enabled' : 'disabled';
    } catch (error) {
        console.error('Error updating password button states:', error);
    }
}

export async function initializePasswordManager() {
    if (isPasswordManagerInitialized) {
        return;
    }
    isPasswordManagerInitialized = true;

    document.getElementById('passwordForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        await validateOverlayPassword();
    });
    document.getElementById('deletePasswordButton').addEventListener('click', deletePassword);
    document.getElementById('setPasswordButton').addEventListener('click', async () => {
        await confirmPassword();
    });

    document.getElementById('passwordInputField').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            document.getElementById('confirmPasswordInputField').focus();
        }
    });

    document.getElementById('confirmPasswordInputField').addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            await confirmPassword();
        }
    });

    // Check if password is set
    const passwordIsSet = await isPasswordSet();
    if (passwordIsSet) {
        showPasswordOverlay();
    } else {
        // Hide or don't show the overlay
        hidePasswordOverlay();
    }

    updateButtonStates();
}

async function isPasswordSet() {
    try {
        const data = await getSync('password');
        return Object.prototype.hasOwnProperty.call(data, 'password') && data.password !== null;
    } catch (error) {
        console.error('Error checking if password is set:', error);
        return false;
    }
}

function getPasswordMessage(key, substitutions) {
    return getUiMessage(key, PASSWORD_MESSAGES[key] || key, substitutions);
}
