async function encryptPassword(password, key) {
    console.log("Input password for encryption:", password);
    
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

    console.log("Combined IV and encrypted data:", combined);
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
        console.log("Base64 string to decode:", base64); // Debug log
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
    console.log("Starting decryption process...");

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
        console.log('Decrypted and decoded password:', decoded);
        return decoded;
    } catch (decryptError) {
        console.error('Error during decryption:', decryptError);
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
        console.log("Starting to set password...");

        // Generate a new encryption key
        console.log("Generating encryption key...");
        const key = await crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );
        console.log("Encryption key generated:", key);

        // Export the key and convert it to a Base64 string for storage
        console.log("Exporting and encoding key...");
        const exportedKey = await crypto.subtle.exportKey("raw", key);
        console.log("Exported key (raw):", exportedKey);
        const keyBase64 = bufferToBase64(exportedKey);
        console.log("Key exported and encoded (Base64):", keyBase64);

        // Store the exported key securely in chrome.storage.local
        console.log("Storing key in chrome.storage.local...");
        chrome.storage.local.set({ key: keyBase64 }, async function() {
            if (chrome.runtime.lastError) {
                console.error("Error storing the key:", chrome.runtime.lastError);
                return;
            }
            console.log("Key stored successfully in chrome.storage.local.");

            // Encrypt the password
            console.log("Encrypting password...");
            const encryptedPassword = await encryptPassword(password, key);
            console.log("Encrypted password (ArrayBuffer):", encryptedPassword);
            const encryptedPasswordBase64 = bufferToBase64(encryptedPassword);
            console.log("Encrypted password (Base64):", encryptedPasswordBase64);

            // Store the encrypted password in chrome.storage.sync
            console.log("Storing encrypted password in chrome.storage.sync...");
            chrome.storage.sync.set({ password: encryptedPasswordBase64 }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error storing the password:", chrome.runtime.lastError);
                } else {
                    console.log('Password is set successfully in chrome.storage.sync.');
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
        } else {
            console.log('Old password is incorrect.');
        }
    });
}

// Function to delete the password
function deletePassword() {
    chrome.storage.sync.remove('password', function() {
        if (chrome.runtime.lastError) {
            console.error('Error deleting password:', chrome.runtime.lastError);
        } else {
            console.log('Password is removed.');
            updateButtonStates(); // Update UI state
        }
    });
}


async function verifyPassword(inputPassword, callback) {
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
                console.log("Retrieved encrypted password (Base64):", encryptedPasswordBase64);

                // Add a check here to ensure the data type
                if (typeof encryptedPasswordBase64 !== 'string') {
                    console.error('Expected a Base64 string, got:', typeof encryptedPasswordBase64);
                    callback(false);
                    return;
                }


                const encryptedPassword = base64ToBuffer(encryptedPasswordBase64);



                 // Pass the Base64 string directly to decryptPassword
                try {
                    const decryptedPassword = await decryptPassword(encryptedPasswordBase64, key);

                    if (decryptedPassword === null) {
                        console.error('Verification error: Decryption failed.');
                        callback(false);
                        return;
                    }

                    // Continue with the password verification
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
    } else {
        console.log('Passwords do not match.');
    }
}

async function validateOverlayPassword() {
    const overlayPassword = document.getElementById('passwordInput').value;
    console.log('Password entered for unlocking:', overlayPassword);
    await verifyPassword(overlayPassword, function(isMatch) {
        if (isMatch) {
            hidePasswordOverlay();
            console.log('Access granted.');
        } else {
            console.log('Access denied. Incorrect password.');
        }
    });
}


// Event listener for the password overlay form submission
document.getElementById('passwordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await validateOverlayPassword();
});
document.getElementById('deletePasswordButton').addEventListener('click', deletePassword);



// New function to update button states
function updateButtonStates() {
    chrome.storage.sync.get('password', function(data) {
        const hasPassword = !!data.password;
        document.getElementById('deletePasswordButton').disabled = !hasPassword;
        document.getElementById('setPasswordButton').disabled = hasPassword;
        document.getElementById('passwordInputField').disabled = hasPassword;
        document.getElementById('confirmPasswordInputField').disabled = hasPassword;

        // Update button class for styling
        const deleteButton = document.getElementById('deletePasswordButton');
        deleteButton.className = hasPassword ? 'enabled' : 'disabled';
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



function showErrorMessage(message) {
    const errorMessageElement = document.getElementById('errorMessage');
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block';

    // Optionally, hide the message after a few seconds
    setTimeout(() => {
        errorMessageElement.style.display = 'none';
    }, 5000);
}

function showSuccessMessage(message) {
    const successMessageElement = document.getElementById('successMessage');
    successMessageElement.textContent = message;
    successMessageElement.style.display = 'block';

    // Optionally, hide the message after a few seconds
    setTimeout(() => {
        successMessageElement.style.display = 'none';
    }, 5000);
}
