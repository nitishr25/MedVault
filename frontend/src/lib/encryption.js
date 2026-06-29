// lib/encryption.js
// Runs entirely in the browser — never on the server

// Derive a key-encryption-key from the user's JWT token
// (later you can swap this for a MetaMask wallet signature)
async function deriveKEK(secret) {
  const secretBytes = new TextEncoder().encode(secret);
  const baseKey = await crypto.subtle.importKey(
    'raw', secretBytes, 'HKDF', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(16),
      info: new Uint8Array()
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['wrapKey', 'unwrapKey']
  );
}

// Encrypt a file before uploading to Pinata
export async function encryptFile(file, userSecret) {
  const kek = await deriveKEK(userSecret);

  // Fresh AES-256-GCM key for this file
  const dek = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Encrypt the file bytes
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const fileBytes = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    fileBytes
  );

  // Wrap the DEK so only this user can unwrap it
  const wrapIv = new Uint8Array(12);
  const wrappedKey = await crypto.subtle.wrapKey(
    'raw', dek, kek, { name: 'AES-GCM', iv: wrapIv }
  );

  return {
    encryptedBlob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    iv: Array.from(iv),
    wrappedKey: Array.from(new Uint8Array(wrappedKey)),
    originalName: file.name,
    originalType: file.type,
    originalSize: file.size
  };
}

// Decrypt a file after fetching from Pinata
export async function decryptFile(ciphertextBuffer, iv, wrappedKey, userSecret) {
  const kek = await deriveKEK(userSecret);

  const dek = await crypto.subtle.unwrapKey(
    'raw',
    new Uint8Array(wrappedKey),
    kek,
    { name: 'AES-GCM', iv: new Uint8Array(12) },
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    dek,
    ciphertextBuffer
  );

  return plaintext;
}