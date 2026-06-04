import { create } from 'zustand';
import { apiRequest } from '../lib/api';
import {
  deriveKeyFromPassword,
  generateE2EEKeyPair,
  encryptPrivateKey,
  decryptPrivateKey,
  bufferToBase64
} from '../lib/crypto';

interface UserState {
  token: string | null;
  user: any | null;
  partner: any | null;
  couple: any | null;
  privateKeyJwk: any | null; // decrypted private key stored ONLY in memory
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (emailOrUsername: string, password: string) => Promise<{ status: number; email?: string }>;
  register: (name: string, username: string, email: string, password: string) => Promise<{ dev_otp?: string }>;
  verifyOtp: (email: string, otp: string, passwordForKeys?: string) => Promise<void>;
  logout: () => void;
  loadUser: (passwordToUnlock?: string) => Promise<void>;
  unlockChat: (password: string) => Promise<boolean>;
  generateKeysAndSave: (password: string) => Promise<void>;
  generatePairCode: () => Promise<string>;
  pairWithCode: (code: string) => Promise<void>;
  unpair: () => Promise<void>;
  updateProfile: (data: { name?: string; bio?: string; profilePhoto?: string }) => Promise<void>;
}

export const useAuthStore = create<UserState>((set, get) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('foreverus_token') : null,
  user: null,
  partner: null,
  couple: null,
  privateKeyJwk: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (emailOrUsername, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (res.status === 203) {
        // Verification OTP required
        set({ isLoading: false });
        return { status: 203, email: data.email };
      }

      // Store token
      localStorage.setItem('foreverus_token', data.token);
      set({ token: data.token, isAuthenticated: true });

      // Load user profile
      await get().loadUser(password);
      
      set({ isLoading: false });
      return { status: 200 };
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  register: async (name, username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest('/auth/register', 'POST', { name, username, email, password });
      set({ isLoading: false });
      return { dev_otp: data.dev_otp };
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  verifyOtp: async (email, otp, passwordForKeys) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiRequest('/auth/verify-otp', 'POST', { email, otp });
      localStorage.setItem('foreverus_token', data.token);
      set({ token: data.token, isAuthenticated: true });

      // If password is provided, generate E2EE keys right away!
      if (passwordForKeys) {
        await get().loadUser(passwordForKeys);
      } else {
        await get().loadUser();
      }
      set({ isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('foreverus_token');
    set({
      token: null,
      user: null,
      partner: null,
      couple: null,
      privateKeyJwk: null,
      isAuthenticated: false,
      error: null
    });
  },

  loadUser: async (passwordToUnlock) => {
    const token = get().token;
    if (!token) return;

    set({ isLoading: true });
    try {
      const data = await apiRequest('/auth/me', 'GET');
      
      set({
        user: data.user,
        partner: data.partner,
        couple: data.couple,
        isAuthenticated: true
      });

      // Decrypt E2EE keys if user already has them
      if (data.user.hasKeys && data.user.encryptedPrivateKey && data.user.privateKeySalt) {
        try {
          const encryptedKeyStr = data.user.encryptedPrivateKey;
          if (encryptedKeyStr.includes(':')) {
            const [iv, ciphertext] = encryptedKeyStr.split(':');
            
            // 1. Try stable automatic unlock using email/username
            const stablePassword = data.user.email || data.user.username || 'foreverus_default';
            let decryptedKey = null;
            let needsReencryption = false;

            try {
              const passwordKey = await deriveKeyFromPassword(stablePassword, data.user.privateKeySalt);
              decryptedKey = await decryptPrivateKey(ciphertext, iv, passwordKey);
            } catch (err) {
              // 2. Fall back to login password if provided (e.g., during active login or verifyOtp)
              if (passwordToUnlock) {
                try {
                  const passwordKey = await deriveKeyFromPassword(passwordToUnlock, data.user.privateKeySalt);
                  decryptedKey = await decryptPrivateKey(ciphertext, iv, passwordKey);
                  needsReencryption = true; // successfully decrypted with old key, mark for migration
                } catch (innerErr) {
                  console.error('[CRYPTO] Failed to decrypt private key with login password', innerErr);
                }
              }
            }

            if (decryptedKey) {
              set({ privateKeyJwk: decryptedKey });

              // Migrate keys to the stable automatic unlock format
              if (needsReencryption) {
                try {
                  const passwordKey = await deriveKeyFromPassword(stablePassword, data.user.privateKeySalt);
                  const { ciphertext: newCipher, iv: newIv } = await encryptPrivateKey(decryptedKey, passwordKey);
                  
                  await apiRequest('/auth/keys', 'POST', {
                    publicKey: data.user.publicKey,
                    encryptedPrivateKey: `${newIv}:${newCipher}`,
                    privateKeySalt: data.user.privateKeySalt
                  });
                  console.log('[CRYPTO] E2EE keys successfully migrated to stable auto-unlock format.');
                } catch (reencErr) {
                  console.error('[CRYPTO] Failed to migrate keys to stable format', reencErr);
                }
              }
            }
          }
        } catch (cryptoErr) {
          console.error('[CRYPTO] Failed to decrypt private key', cryptoErr);
        }
      } 
      // If user does not have keys, generate them automatically!
      else if (!data.user.hasKeys) {
        const genPassword = passwordToUnlock || data.user.email || data.user.username || 'foreverus_default';
        await get().generateKeysAndSave(genPassword);
      }

      set({ isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message, isAuthenticated: false });
    }
  },

  unlockChat: async (password) => {
    const user = get().user;
    if (!user || !user.hasKeys || !user.encryptedPrivateKey || !user.privateKeySalt) {
      return false;
    }

    try {
      const encryptedKeyStr = user.encryptedPrivateKey;
      if (!encryptedKeyStr || !encryptedKeyStr.includes(':')) {
        console.warn('[CRYPTO] Invalid or old E2EE key format.');
        return false;
      }
      const [iv, ciphertext] = encryptedKeyStr.split(':');
      const passwordKey = await deriveKeyFromPassword(password, user.privateKeySalt);
      const decryptedKey = await decryptPrivateKey(
        ciphertext,
        iv,
        passwordKey
      );
      set({ privateKeyJwk: decryptedKey });

      // Migrate keys to the stable automatic unlock format
      try {
        const stablePassword = user.email || user.username || 'foreverus_default';
        const stablePasswordKey = await deriveKeyFromPassword(stablePassword, user.privateKeySalt);
        const { ciphertext: newCipher, iv: newIv } = await encryptPrivateKey(decryptedKey, stablePasswordKey);
        
        await apiRequest('/auth/keys', 'POST', {
          publicKey: user.publicKey,
          encryptedPrivateKey: `${newIv}:${newCipher}`,
          privateKeySalt: user.privateKeySalt
        });
        console.log('[CRYPTO] E2EE keys successfully migrated to stable format via manual unlock.');
      } catch (reencErr) {
        console.error('[CRYPTO] Failed to migrate keys to stable format during manual unlock', reencErr);
      }

      return true;
    } catch (err) {
      console.error('[CRYPTO] Incorrect password to unlock chat', err);
      return false;
    }
  },

  generateKeysAndSave: async (password) => {
    set({ isLoading: true });
    try {
      // 1. Generate new RSA key pair
      const { publicKeyJwk, privateKeyJwk } = await generateE2EEKeyPair();

      // 2. Derive password key from a new salt
      const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
      const saltBase64 = bufferToBase64(saltBytes.buffer);
      
      const passwordKey = await deriveKeyFromPassword(password, saltBase64);

      // 3. Encrypt the private key
      const { ciphertext, iv } = await encryptPrivateKey(privateKeyJwk, passwordKey);

      // 4. Save to backend (send salt as privateKeySalt, ciphertext as encryptedPrivateKey)
      await apiRequest('/auth/keys', 'POST', {
        publicKey: JSON.stringify(publicKeyJwk),
        encryptedPrivateKey: `${iv}:${ciphertext}`,
        privateKeySalt: saltBase64
      });

      // 5. Store private key in-memory
      set({
        privateKeyJwk,
        user: {
          ...get().user,
          hasKeys: true,
          publicKey: JSON.stringify(publicKeyJwk)
        }
      });
    } catch (err: any) {
      console.error('[CRYPTO] Key generation failed:', err);
      set({ error: 'Failed to initialize security keys' });
    } finally {
      set({ isLoading: false });
    }
  },

  generatePairCode: async () => {
    try {
      const res = await apiRequest('/couple/generate-code', 'POST');
      set({
        user: { ...get().user, pairingCode: res.pairingCode }
      });
      return res.pairingCode;
    } catch (err: any) {
      throw err;
    }
  },

  pairWithCode: async (code) => {
    set({ isLoading: true });
    try {
      const res = await apiRequest('/couple/pair', 'POST', { code });
      set({
        couple: res.couple,
        partner: res.partner,
        user: {
          ...get().user,
          partnerId: res.partner.id,
          coupleId: res.couple._id
        }
      });
    } catch (err: any) {
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  unpair: async () => {
    set({ isLoading: true });
    try {
      await apiRequest('/couple/unpair', 'POST');
      set({
        couple: null,
        partner: null,
        privateKeyJwk: null,
        user: {
          ...get().user,
          partnerId: null,
          coupleId: null
        }
      });
    } catch (err: any) {
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (profileData) => {
    try {
      const res = await apiRequest('/auth/profile', 'PUT', profileData);
      set({ user: res.user });
    } catch (err: any) {
      throw err;
    }
  }
}));
