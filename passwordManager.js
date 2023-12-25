async function encryptPassword(password, key) {
    const encoded = new TextEncoder().encode(password);
    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: window.crypto.getRandomValues(new Uint8Array(12))
        },
        key,
        encoded
    );
    return encrypted;
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
    var binaryString = window.atob(base64);
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}


async function decryptPassword(combinedBase64, key) {
    const combined = base64ToBuffer(combinedBase64);
    // Extract the IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt data
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encryptedData
    );
    const decoded = new TextDecoder().decode(decrypted);
    console.log('Decrypted Password:', decoded); // Log the decrypted password
    return decoded;
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
    const key = await generateKey(); // Ideally, use a previously generated/stored key
    const encryptedPassword = await encryptPassword(password, key);
    const encryptedPasswordBase64 = bufferToBase64(encryptedPassword);

    chrome.storage.sync.set({ password: encryptedPasswordBase64 }, function() {
        console.log('Password is set.');
        console.log('Unencrypted Password:', password); // Log the unencrypted password
        console.log('Encrypted Password:', encryptedPasswordBase64); // Log the encrypted password
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
        if (chrome.runtime.lastError) {
            console.error('Error deleting password:', chrome.runtime.lastError);
        } else {
            console.log('Password is removed.');
            updateButtonStates(); // Update UI state
        }
    });
}


async function verifyPassword(inputPassword, callback) {
    chrome.storage.sync.get('password', async function(data) {
        const key = await generateKey(); // Use the correct key for decryption
        const storedPassword = await decryptPassword(data.password, key);
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


async function confirmPassword() {
    const password = document.getElementById('passwordInputField').value;
    const confirmPassword = document.getElementById('confirmPasswordInputField').value;
    if (password === confirmPassword) {
        await setPassword(password); // This is now an async call
    } else {
        console.log('Passwords do not match.');
    }
}

// Function to validate password entered in the overlay
async function validateOverlayPassword() {
    const overlayPassword = document.getElementById('passwordInput').value;
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


// Call updateButtonStates on page load
document.addEventListener('DOMContentLoaded', updateButtonStates);

document.getElementById('setPasswordButton').addEventListener('click', async () => {
    await confirmPassword();
});
