// End-to-End Encryption (E2EE) Utility using Web Crypto API

// Helpers for buffer conversions
export const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
  return btoa(binary);
};

export const base64ToBuffer = (base64: string): ArrayBuffer => {
  if (typeof base64 !== 'string') {
    throw new TypeError(`Expected string for base64ToBuffer, got ${typeof base64}`);
  }
  // 1. Remove all whitespace, newlines, carriage returns
  let cleaned = base64.replace(/\s/g, '');
  
  // 2. Restore '+' if it was URL-decoded into a space ' '
  cleaned = cleaned.replace(/ /g, '+');
  
  // 3. Fix missing or incorrect padding
  const padLength = (4 - (cleaned.length % 4)) % 4;
  if (padLength > 0) {
    cleaned += '='.repeat(padLength);
  }

  const binaryString = atob(cleaned);
  const len = binaryString.length;
  const charCodes = Array.from({ length: len }, (_, i) => binaryString.charCodeAt(i));
  const bytes = new Uint8Array(charCodes);
  return bytes.buffer;
};



const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// 1. Derive Symmetric Key from Password (for encrypting private key)
export const deriveKeyFromPassword = async (password: string, saltBase64: string): Promise<CryptoKey> => {
  const salt = base64ToBuffer(saltBase64);
  const passwordBuffer = textEncoder.encode(password);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// 2. Encrypt Private Key for Backup
export const encryptPrivateKey = async (privateKeyJwk: any, passwordKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> => {
  const privateKeyStr = JSON.stringify(privateKeyJwk);
  const data = textEncoder.encode(privateKeyStr);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    passwordKey,
    data
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer)
  };
};

// 3. Decrypt Private Key from Backup
export const decryptPrivateKey = async (encryptedData: string, ivBase64: string, passwordKey: CryptoKey): Promise<any> => {
  const data = base64ToBuffer(encryptedData);
  const iv = base64ToBuffer(ivBase64);

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    passwordKey,
    data
  );

  const decryptedStr = textDecoder.decode(decrypted);
  return JSON.parse(decryptedStr);
};

// 4. Generate RSA-OAEP Key Pair for Chat Encryption
export const generateE2EEKeyPair = async (): Promise<{ publicKeyJwk: any; privateKeyJwk: any }> => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
};

// 5. Encrypt Message for Recipient and Sender (Web Crypto API)
export const encryptMessage = async (
  messageText: string,
  recipientPublicKeyJwk: any,
  senderPublicKeyJwk: any
): Promise<{
  encryptedContent: string;
  iv: string;
  encryptedKeySender: string;
  encryptedKeyRecipient: string;
}> => {
  // Generate random message key (AES-GCM 256)
  const messageKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const messageKeyRaw = await window.crypto.subtle.exportKey('raw', messageKey);

  // Encrypt the message text with the AES key
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = textEncoder.encode(messageText);
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    messageKey,
    data
  );

  // Import recipient and sender RSA public keys
  const recipientKey = await window.crypto.subtle.importKey(
    'jwk',
    recipientPublicKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const senderKey = await window.crypto.subtle.importKey(
    'jwk',
    senderPublicKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  // Encrypt (Wrap) the raw AES key buffer using recipient & sender public RSA keys
  const wrappedKeyRecipient = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientKey,
    messageKeyRaw
  );

  const wrappedKeySender = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    senderKey,
    messageKeyRaw
  );

  return {
    encryptedContent: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
    encryptedKeySender: bufferToBase64(wrappedKeySender),
    encryptedKeyRecipient: bufferToBase64(wrappedKeyRecipient)
  };
};

// 6. Decrypt Message using private RSA key
export const decryptMessage = async (
  encryptedContent: string,
  ivBase64: string,
  encryptedKeyBase64: string,
  privateKeyJwk: any
): Promise<string> => {
  const content = base64ToBuffer(encryptedContent);
  const iv = base64ToBuffer(ivBase64);
  const wrappedKey = base64ToBuffer(encryptedKeyBase64);

  // Import private key
  const privateKey = await window.crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  );

  // Decrypt (unwrap) the AES key
  const aesKeyRaw = await window.crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    wrappedKey
  );

  // Import the AES key back
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    aesKeyRaw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decrypt message content
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    content
  );

  return textDecoder.decode(decrypted);
};
