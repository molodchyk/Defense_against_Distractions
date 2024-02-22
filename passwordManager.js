/*
 * Defense Against Distractions Extension
 *
 * file: passwordManager.js
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
 * Copyright (C) 2023-2024 Oleksandr Molodchyk
 */

import { isCurrentTimeInAnySchedule } from './utilityFunctions.js';

const MAX_ATTEMPTS = 5;
const LOCKOUT_INTERVAL = 30 * 1000; // 30 seconds

async function encryptPassword(password, key) {
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encoded = new TextEncoder().encode(password);
    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encoded
    );

    // Combine IV and encrypted data
    let combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return combined;
}



async function generateKey() {
    return await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"]
    );
}

function bufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToBuffer(base64) {
    if (typeof base64 !== 'string') {
        console.error('base64ToBuffer expects a string, got:', base64);
        return null;
    }
    try {
        var binaryString = window.atob(base64);
        var len = binaryString.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        console.error('Failed to decode Base64 string:', e);
        return null; // Return null to indicate a failure
    }
}



async function decryptPassword(combinedBase64, key) {

    // Convert Base64 to ArrayBuffer and extract IV and encrypted data
    const combined = base64ToBuffer(combinedBase64);
    if (!combined) {
        console.error('Decryption error: Invalid Base64 encoding.');
        return null; 
    }

    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    try {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encryptedData
        );
        const decoded = new TextDecoder().decode(decrypted);
        return decoded;
    } catch (decryptError) {
        return null;
    }
}





async function encryptData(data, key) {
    // Generate a random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt data
    const encoded = new TextEncoder().encode(data);
    const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoded
    );

    // Combine the IV with the encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return combined;
}

async function decryptData(combined, key) {
    // Extract the IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encryptedData
    );

    return new TextDecoder().decode(decryptedData);
}

async function setPassword(password) {
    try {
        const key = await crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );


        const exportedKey = await crypto.subtle.exportKey("raw", key);

        const keyBase64 = bufferToBase64(exportedKey);



        chrome.storage.local.set({ key: keyBase64 }, async function() {
            if (chrome.runtime.lastError) {
                console.error("Error storing the key:", chrome.runtime.lastError);
                return;
            }

            // Encrypt the password
            const encryptedPassword = await encryptPassword(password, key);
            const encryptedPasswordBase64 = bufferToBase64(encryptedPassword);

            // Store the encrypted password in chrome.storage.sync
            chrome.storage.sync.set({ password: encryptedPasswordBase64 }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error storing the password:", chrome.runtime.lastError);
                } else {
                    updateButtonStates(); // Update UI state
                }
            });
        });
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
function deletePassword() {
    chrome.storage.sync.remove('password', function() {
        if (chrome.runtime.lastError) {
            console.error('Error deleting password:', chrome.runtime.lastError);
        } else {
            updateButtonStates(); // Update UI state
        }
    });
}


async function verifyPassword(inputPassword, callback) {
    const attemptData = await getAttemptData();
    const currentTime = new Date().getTime();
    const timeSinceLastAttempt = currentTime - attemptData.lastAttempt;
    const timeRemaining = LOCKOUT_INTERVAL - timeSinceLastAttempt;


    // Check if the lockout period is active
    if (attemptData.attempts >= MAX_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_INTERVAL) {
        const timeRemainingAlert = chrome.i18n.getMessage("tooManyAttempts", [Math.ceil(timeRemaining / 1000).toString()]);
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
        // Retrieve the stored encryption key securely from chrome.storage.local
        chrome.storage.local.get('key', async function(data) {
            if (chrome.runtime.lastError || !data.key) {
                console.error('Error retrieving the key:', chrome.runtime.lastError);
                callback(false);
                return;
            }

            const keyBase64 = data.key;
            const keyBuffer = base64ToBuffer(keyBase64);

            // Import the key from the buffer
            const key = await crypto.subtle.importKey(
                "raw",
                keyBuffer,
                { name: "AES-GCM", length: 256 },
                true,
                ["decrypt"]
            );

            // Retrieve the stored encrypted password
            chrome.storage.sync.get('password', async function(data) {
                if (chrome.runtime.lastError || !data.password) {
                    console.error('Error retrieving the password:', chrome.runtime.lastError);
                    callback(false);
                    return;
                }

                const encryptedPasswordBase64 = data.password;

                // Add a check here to ensure the data type
                if (typeof encryptedPasswordBase64 !== 'string') {
                    console.error('Expected a Base64 string, got:', typeof encryptedPasswordBase64);
                    callback(false);
                    return;
                }

                 // Pass the Base64 string directly to decryptPassword
                try {
                    const decryptedPassword = await decryptPassword(encryptedPasswordBase64, key);

                    // After updating attempt count
                    if (decryptedPassword === null || inputPassword !== decryptedPassword) {
                        await updateAttemptData(attemptData.attempts + 1);
                        const attemptsLeftAlert = chrome.i18n.getMessage("incorrectPassword", [(MAX_ATTEMPTS - attemptData.attempts).toString()]);
                        alert(attemptsLeftAlert);

                        callback(false);
                        return;
                    }

                    // Continue with the password verification
                    await updateAttemptData(0);
                    callback(inputPassword === decryptedPassword);
                } catch (decryptError) {
                    console.error('Error decrypting the password:', decryptError);
                    callback(false);
                }
            });
        });
    } catch (error) {
        console.error("Error verifying the password:", error);
        callback(false);
    }
}



// Function to get attempt data from storage
async function getAttemptData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['attempts', 'lastAttempt'], function(data) {
            resolve({
                attempts: data.attempts || 0,
                lastAttempt: data.lastAttempt || 0
            });
        });
    });
}

// Function to update attempt data in storage
async function updateAttemptData(attempts) {
    const data = {
        attempts: attempts,
        lastAttempt: new Date().getTime()
    };
    return new Promise((resolve) => {
        chrome.storage.local.set(data, resolve);
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


async function confirmPassword() {
    const password = document.getElementById('passwordInputField').value;
    const confirmPassword = document.getElementById('confirmPasswordInputField').value;
    if (password === confirmPassword) {
        await setPassword(password); // This is now an async call
    }
    else {
        alert(chrome.i18n.getMessage("passwordMismatchAlert"));
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


// Event listener for the password overlay form submission
document.getElementById('passwordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await validateOverlayPassword();
});
document.getElementById('deletePasswordButton').addEventListener('click', deletePassword);

export function updateButtonStates() {
    chrome.storage.sync.get(['password', 'schedules'], function(data) {
        const hasPassword = !!data.password;

        // Check if current time is in any schedule
        chrome.storage.sync.get('schedules', ({ schedules }) => {
            if (isCurrentTimeInAnySchedule(schedules)) {
                // Disable all elements if current time is in any schedule
                document.getElementById('deletePasswordButton').disabled = true;
                document.getElementById('setPasswordButton').disabled = true;
                document.getElementById('passwordInputField').disabled = true;
                document.getElementById('confirmPasswordInputField').disabled = true;

                const deleteButton = document.getElementById('deletePasswordButton');
                deleteButton.className = 'disabled';
            } else {
                // Otherwise, enable/disable based on password
                document.getElementById('deletePasswordButton').disabled = !hasPassword;
                document.getElementById('setPasswordButton').disabled = hasPassword;
                document.getElementById('passwordInputField').disabled = hasPassword;
                document.getElementById('confirmPasswordInputField').disabled = hasPassword;

                // Update button class for styling
                const deleteButton = document.getElementById('deletePasswordButton');
                deleteButton.className = hasPassword ? 'enabled' : 'disabled';
            }

        });
    });
}


document.addEventListener('DOMContentLoaded', async () => {
    // Check if password is set
    const passwordIsSet = await isPasswordSet();
    if (passwordIsSet) {
        showPasswordOverlay();
    } else {
        // Hide or don't show the overlay
        hidePasswordOverlay();
    }

    updateButtonStates();
});

async function isPasswordSet() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('password', function(data) {
            if (chrome.runtime.lastError) {
                console.error('Error checking if password is set:', chrome.runtime.lastError);
                resolve(false);
                return;
            }

            const passwordExists = data.hasOwnProperty('password') && data.password !== null;
            resolve(passwordExists);
        });
    });
}



document.getElementById('setPasswordButton').addEventListener('click', async () => {
    await confirmPassword();
});



// Add an event listener for passwordInputField
document.getElementById('passwordInputField').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent the default form submission
        document.getElementById('confirmPasswordInputField').focus();
    }
});

// Add an event listener for confirmPasswordInputField
document.getElementById('confirmPasswordInputField').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent the default form submission
        await confirmPassword();
    }
});
