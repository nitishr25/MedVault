// lib/encryption.js
// Runs entirely in the browser — never on the server.
//
// Each file gets a fresh random AES-256-GCM data-encryption-key (DEK). The
// DEK itself is protected with RSA-OAEP under the *owner's own* RSA public
// key (the same keypair already used for doctor-sharing), so only someone
// holding that user's private key can ever recover it. There is no shared
// secret anywhere in this file — every wrap is tied to one specific user's
// real keypair.

function pemToArrayBuffer(pem) {
  const base64 = pem.replace(/-----BEGIN [A-Z ]+-----/, '').replace(/-----END [A-Z ]+-----/, '').replace(/\s+/g, '');
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function importPublicKey(publicKeyPem) {
  return crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
}

async function importPrivateKey(privateKeyPem) {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );
}

// Encrypt a file before uploading to Pinata.
// `ownerPublicKeyPem` is the PEM public key of whoever should be able to
// decrypt this copy — normally the uploading patient's own public key.
export async function encryptFile(file, ownerPublicKeyPem) {
  const publicKey = await importPublicKey(ownerPublicKeyPem);

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

  // Export the raw DEK bytes and wrap them with RSA-OAEP — no shared IV/nonce
  // involved at all, since RSA-OAEP is randomized internally per call.
  const rawDek = await crypto.subtle.exportKey('raw', dek);
  const wrappedKeyBuffer = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawDek);

  return {
    encryptedBlob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    iv: Array.from(iv),
    wrappedKey: Array.from(new Uint8Array(wrappedKeyBuffer)),
    originalName: file.name,
    originalType: file.type,
    originalSize: file.size
  };
}

// Decrypt a file after fetching from Pinata.
// `recipientPrivateKeyPem` must be the private key matching whichever public
// key this specific `wrappedKey` was wrapped under (the owner's own key for
// record.wrappedKey, or the viewing doctor's own key for a sharedAccess entry).
export async function decryptFile(ciphertextBuffer, iv, wrappedKey, recipientPrivateKeyPem) {
  const privateKey = await importPrivateKey(recipientPrivateKeyPem);

  const rawDek = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    new Uint8Array(wrappedKey)
  );

  const dek = await crypto.subtle.importKey(
    'raw',
    rawDek,
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

// Re-wrap an already-unwrapped raw DEK for a new recipient — used by the
// share/grant-access flow, which unwraps under the owner's key and needs to
// wrap the same DEK under a doctor's public key without ever touching the
// file content again.
export async function rewrapKeyForRecipient(rawDekBytes, recipientPublicKeyPem) {
  const publicKey = await importPublicKey(recipientPublicKeyPem);
  const wrappedKeyBuffer = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawDekBytes);
  return Array.from(new Uint8Array(wrappedKeyBuffer));
}

// Unwrap a wrappedKey back to raw DEK bytes without decrypting a file —
// used by the share flow to recover the DEK before re-wrapping it.
export async function unwrapToRawKey(wrappedKey, ownerPrivateKeyPem) {
  const privateKey = await importPrivateKey(ownerPrivateKeyPem);
  const rawDek = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    new Uint8Array(wrappedKey)
  );
  return new Uint8Array(rawDek);
}
