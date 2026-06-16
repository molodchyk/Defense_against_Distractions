// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2023-2026 Oleksandr Molodchyk

const AES_GCM = 'AES-GCM';
const IV_LENGTH = 12;

export async function generatePasswordKey() {
  return crypto.subtle.generateKey(
    {
      name: AES_GCM,
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKeyToBase64(key) {
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64(exportedKey);
}

export async function importPasswordKey(keyBase64, usages = ['decrypt']) {
  const keyBuffer = base64ToBuffer(keyBase64);
  if (!keyBuffer) {
    return null;
  }

  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: AES_GCM, length: 256 },
    true,
    usages
  );
}

export async function encryptPassword(password, key) {
  const encryptedPassword = await encryptString(password, key);
  return bufferToBase64(encryptedPassword);
}

export async function decryptPassword(combinedBase64, key) {
  const combined = base64ToBuffer(combinedBase64);
  if (!combined) {
    console.error('Decryption error: Invalid Base64 encoding.');
    return null;
  }

  try {
    return await decryptString(combined, key);
  } catch (decryptError) {
    return null;
  }
}

export async function encryptString(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(data);
  const encryptedData = await crypto.subtle.encrypt(
    { name: AES_GCM, iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedData), iv.length);

  return combined;
}

export async function decryptString(combined, key) {
  const iv = combined.slice(0, IV_LENGTH);
  const encryptedData = combined.slice(IV_LENGTH);
  const decryptedData = await crypto.subtle.decrypt(
    { name: AES_GCM, iv },
    key,
    encryptedData
  );

  return new TextDecoder().decode(decryptedData);
}

export function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < bytes.byteLength; index++) {
    binary += String.fromCharCode(bytes[index]);
  }

  return window.btoa(binary);
}

export function base64ToBuffer(base64) {
  if (typeof base64 !== 'string') {
    console.error('base64ToBuffer expects a string, got:', base64);
    return null;
  }

  try {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let index = 0; index < binaryString.length; index++) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    return bytes.buffer;
  } catch (error) {
    console.error('Failed to decode Base64 string:', error);
    return null;
  }
}
