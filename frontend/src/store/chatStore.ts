import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { apiRequest } from '../lib/api';
import { decryptMessage, encryptMessage } from '../lib/crypto';
import { useAuthStore } from './authStore';

interface ChatState {
  socket: Socket | null;
  messages: any[];
  decryptedMessages: Map<string, string>; // Map of messageId -> decrypted text
  partnerIsTyping: boolean;
  partnerPresence: 'online' | 'offline';
  partnerLastSeen: Date | null;
  isLoading: boolean;

  initSocket: (token: string) => void;
  disconnectSocket: () => void;
  fetchMessages: () => Promise<void>;
  sendMessage: (
    content: string,
    mediaUrl?: string,
    mediaType?: 'text' | 'image' | 'video' | 'voice' | 'document' | 'gif' | 'sticker',
    replyToId?: string
  ) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessageForEveryone: (messageId: string) => Promise<void>;
  deleteMessageForMe: (messageId: string) => Promise<void>;
  togglePinMessage: (messageId: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  decryptLocalMessage: (message: any) => Promise<string>;
  decryptAllMessages: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  messages: [],
  decryptedMessages: new Map(),
  partnerIsTyping: false,
  partnerPresence: 'offline',
  partnerLastSeen: null,
  isLoading: false,

  initSocket: (token) => {
    if (get().socket) return;

    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected to real-time server');
    });

    socket.on('presence-change', (data: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => {
      const partner = useAuthStore.getState().partner;
      if (partner && data.userId === partner.id) {
        set({
          partnerPresence: data.status,
          partnerLastSeen: data.lastSeen ? new Date(data.lastSeen) : null
        });
      }
    });

    socket.on('typing-change', (data: { userId: string; isTyping: boolean }) => {
      const partner = useAuthStore.getState().partner;
      if (partner && data.userId === partner.id) {
        set({ partnerIsTyping: data.isTyping });
      }
    });

    socket.on('receive-message', async (message: any) => {
      const messages = get().messages;
      set({ messages: [...messages, message] });

      // Trigger local decryption
      await get().decryptLocalMessage(message);

      // Send read receipt if active
      if (message.senderId !== useAuthStore.getState().user?.id) {
        socket.emit('read-messages', {
          coupleId: message.coupleId,
          messageIds: [message._id]
        });
      }
    });

    socket.on('messages-read', (data: { readerId: string; messageIds: string[]; readAt: string }) => {
      set((state) => ({
        messages: state.messages.map((m) => {
          if (data.messageIds.includes(m._id)) {
            return { ...m, readAt: new Date(data.readAt) };
          }
          return m;
        })
      }));
    });

    socket.on('streak-updated', (data: { streak: number; xp: number; level?: number }) => {
      const couple = useAuthStore.getState().couple;
      if (couple) {
        useAuthStore.setState({
          couple: {
            ...couple,
            streakCount: data.streak,
            xp: data.xp,
            level: data.level || couple.level
          }
        });
      }
    });

    socket.on('xp-updated', (data: { xp: number; level: number }) => {
      const couple = useAuthStore.getState().couple;
      if (couple) {
        useAuthStore.setState({
          couple: {
            ...couple,
            xp: data.xp,
            level: data.level
          }
        });
      }
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchMessages: async () => {
    set({ isLoading: true });
    try {
      const data = await apiRequest('/chat/messages', 'GET');
      set({ messages: data, isLoading: false });
      
      // Decrypt all
      await get().decryptAllMessages();
    } catch (err) {
      set({ isLoading: false });
    }
  },

  decryptLocalMessage: async (message: any): Promise<string> => {
    const privateKeyJwk = useAuthStore.getState().privateKeyJwk;
    const userId = useAuthStore.getState().user?.id;

    if (!privateKeyJwk) {
      return '[Message Locked - Enter chat password]';
    }

    if (message.isDeleted) {
      return 'This message was deleted';
    }

    // Check cache
    if (get().decryptedMessages.has(message._id)) {
      return get().decryptedMessages.get(message._id) || '';
    }

    try {
      const isSender = message.senderId === userId;
      const keyToUse = isSender ? message.encryptedKeySender : message.encryptedKeyRecipient;
      
      const decryptedText = await decryptMessage(
        message.encryptedContent,
        message.iv,
        keyToUse,
        privateKeyJwk
      );

      set((state) => {
        const next = new Map(state.decryptedMessages);
        next.set(message._id, decryptedText);
        return { decryptedMessages: next };
      });

      return decryptedText;
    } catch (err) {
      console.error('Decryption failed for message:', message._id, err);
      return '[Failed to Decrypt]';
    }
  },

  decryptAllMessages: async () => {
    const messages = get().messages;
    for (const msg of messages) {
      await get().decryptLocalMessage(msg);
    }
  },

  sendMessage: async (content, mediaUrl, mediaType, replyToId) => {
    const socket = get().socket;
    const auth = useAuthStore.getState();
    
    if (!socket || !auth.user || !auth.partner || !auth.couple) {
      throw new Error('Socket or couple details not initialized');
    }

    try {
      // 1. Parse keys
      const userPublicKeyJwk = JSON.parse(auth.user.publicKey);
      const partnerPublicKeyJwk = JSON.parse(auth.partner.publicKey);

      // 2. Encrypt message locally using recipient and sender keys
      const { encryptedContent, iv, encryptedKeySender, encryptedKeyRecipient } =
        await encryptMessage(content, partnerPublicKeyJwk, userPublicKeyJwk);

      // 3. Send over Socket
      socket.emit('send-message', {
        coupleId: auth.couple._id,
        recipientId: auth.partner.id,
        encryptedContent,
        iv,
        encryptedKeySender,
        encryptedKeyRecipient,
        mediaUrl,
        mediaType: mediaType || 'text',
        replyTo: replyToId
      });
    } catch (err: any) {
      console.error('[E2EE] Message encryption/send failed', err);
      throw err;
    }
  },

  editMessage: async (messageId, newContent) => {
    const auth = useAuthStore.getState();
    if (!auth.user || !auth.partner) return;

    try {
      const userPublicKeyJwk = JSON.parse(auth.user.publicKey);
      const partnerPublicKeyJwk = JSON.parse(auth.partner.publicKey);

      const { encryptedContent, iv, encryptedKeySender, encryptedKeyRecipient } =
        await encryptMessage(newContent, partnerPublicKeyJwk, userPublicKeyJwk);

      const updatedMsg = await apiRequest(`/chat/messages/${messageId}/edit`, 'PUT', {
        encryptedContent,
        iv,
        encryptedKeySender,
        encryptedKeyRecipient
      });

      // Update in state
      set((state) => {
        const next = new Map(state.decryptedMessages);
        next.set(messageId, newContent);
        return {
          messages: state.messages.map((m) => (m._id === messageId ? updatedMsg : m)),
          decryptedMessages: next
        };
      });
    } catch (err) {
      console.error('Error editing message', err);
    }
  },

  deleteMessageForEveryone: async (messageId) => {
    try {
      const updatedMsg = await apiRequest(`/chat/messages/${messageId}/everyone`, 'DELETE');
      set((state) => {
        const next = new Map(state.decryptedMessages);
        next.set(messageId, 'This message was deleted');
        return {
          messages: state.messages.map((m) => (m._id === messageId ? updatedMsg : m)),
          decryptedMessages: next
        };
      });
    } catch (err) {
      console.error('Error deleting message for everyone', err);
    }
  },

  deleteMessageForMe: async (messageId) => {
    try {
      await apiRequest(`/chat/messages/${messageId}/me`, 'DELETE');
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId)
      }));
    } catch (err) {
      console.error('Error deleting message for me', err);
    }
  },

  togglePinMessage: async (messageId) => {
    try {
      const updatedMsg = await apiRequest(`/chat/messages/${messageId}/pin`, 'PUT');
      set((state) => ({
        messages: state.messages.map((m) => (m._id === messageId ? updatedMsg : m))
      }));
    } catch (err) {
      console.error('Error pinning message', err);
    }
  },

  setTyping: (isTyping) => {
    const socket = get().socket;
    const coupleId = useAuthStore.getState().couple?._id;
    if (socket && coupleId) {
      socket.emit(isTyping ? 'typing' : 'stop-typing', { coupleId });
    }
  }
}));
