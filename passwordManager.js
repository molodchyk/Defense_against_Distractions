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


async function decryptPassword(combined, key) {
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

    chrome.storage.sync.set({ password: encryptedPassword }, function() {
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

document.getElementById('setPasswordButton').addEventListener('click', async () => {
    await confirmPassword();
});
