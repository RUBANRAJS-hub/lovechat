import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Couple from '../models/Couple';
import Message from '../models/Message';

const JWT_SECRET = process.env.JWT_SECRET || 'foreverus_secure_jwt_secret_key_2026';

// Map of userId -> socketIds
const activeConnections = new Map<string, string[]>();

export const initSocket = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`[SOCKET] User connected: ${userId} (Socket: ${socket.id})`);

    // Track active connection
    const userSockets = activeConnections.get(userId) || [];
    userSockets.push(socket.id);
    activeConnections.set(userId, userSockets);

    // Fetch user details to get couple ID
    let user = await User.findById(userId);
    if (user && user.coupleId) {
      const coupleIdStr = user.coupleId.toString();
      socket.join(`couple_${coupleIdStr}`);

      // Broadcast user online status
      socket.to(`couple_${coupleIdStr}`).emit('presence-change', {
        userId,
        status: 'online'
      });

      // Update user last active
      user.lastActive = new Date();
      await user.save();
    }

    // --- Typing Indicators ---
    socket.on('typing', (data: { coupleId: string }) => {
      socket.to(`couple_${data.coupleId}`).emit('typing-change', {
        userId,
        isTyping: true
      });
    });

    socket.on('stop-typing', (data: { coupleId: string }) => {
      socket.to(`couple_${data.coupleId}`).emit('typing-change', {
        userId,
        isTyping: false
      });
    });

    // --- Message Read Receipts ---
    socket.on('read-messages', async (data: { coupleId: string; messageIds: string[] }) => {
      try {
        const now = new Date();
        await Message.updateMany(
          { _id: { $in: data.messageIds }, recipientId: userId },
          { $set: { readAt: now } }
        );
        socket.to(`couple_${data.coupleId}`).emit('messages-read', {
          readerId: userId,
          messageIds: data.messageIds,
          readAt: now
        });
      } catch (err) {
        console.error('Error updating read receipts:', err);
      }
    });

    // --- E2EE Chat Messaging & Streaks ---
    socket.on('send-message', async (data: {
      coupleId: string;
      recipientId: string;
      encryptedContent: string;
      iv: string;
      encryptedKeySender: string;
      encryptedKeyRecipient: string;
      mediaUrl?: string;
      mediaType?: 'text' | 'image' | 'video' | 'voice' | 'document' | 'gif' | 'sticker';
      replyTo?: string;
    }) => {
      try {
        const { coupleId, recipientId, encryptedContent, iv, encryptedKeySender, encryptedKeyRecipient, mediaUrl, mediaType, replyTo } = data;

        // Save encrypted message to DB
        const message = new Message({
          coupleId,
          senderId: userId,
          recipientId,
          encryptedContent,
          iv,
          encryptedKeySender,
          encryptedKeyRecipient,
          mediaUrl,
          mediaType: mediaType || 'text',
          replyTo: replyTo || null
        });

        await message.save();
        
        // Populate replyTo if it exists
        if (replyTo) {
          await message.populate('replyTo', 'encryptedContent iv encryptedKeySender encryptedKeyRecipient senderId mediaUrl mediaType');
        }

        // Broadcast message to room
        io.to(`couple_${coupleId}`).emit('receive-message', message);

        // Update streak logic
        const couple = await Couple.findById(coupleId);
        if (couple) {
          const lastActiveDate = new Date(couple.lastActiveDate);
          const today = new Date();
          
          // Clear time for comparison
          const lastActiveMidnight = new Date(lastActiveDate.getFullYear(), lastActiveDate.getMonth(), lastActiveDate.getDate()).getTime();
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;

          if (todayMidnight - lastActiveMidnight >= oneDayMs * 2) {
            // Streak broken (more than 1 day since last activity)
            couple.streakCount = 1;
            couple.xp += 5;
            couple.lastActiveDate = today;
            await couple.save();
            io.to(`couple_${coupleId}`).emit('streak-updated', { streak: 1, xp: couple.xp });
          } else if (todayMidnight - lastActiveMidnight === oneDayMs) {
            // Consecutive day - increment streak
            couple.streakCount += 1;
            // Reward XP for keeping streak: 5 XP * streak count (capped at 50 XP per day)
            const streakBonus = Math.min(5 * couple.streakCount, 50);
            couple.xp += 10 + streakBonus; // base 10 XP + streak bonus
            
            // Check level up (100 XP per level scaling)
            const nextLevelThreshold = couple.level * 200;
            if (couple.xp >= nextLevelThreshold) {
              couple.level += 1;
            }

            couple.lastActiveDate = today;
            await couple.save();
            io.to(`couple_${coupleId}`).emit('streak-updated', { 
              streak: couple.streakCount, 
              xp: couple.xp, 
              level: couple.level 
            });
          } else if (todayMidnight === lastActiveMidnight) {
            // Same day activity - just add minor XP (1 XP per message, capped at 10 XP/day, let's keep it simple and add 2 XP)
            couple.xp += 2;
            const nextLevelThreshold = couple.level * 200;
            if (couple.xp >= nextLevelThreshold) {
              couple.level += 1;
            }
            await couple.save();
            io.to(`couple_${coupleId}`).emit('xp-updated', { xp: couple.xp, level: couple.level });
          }
        }
      } catch (err) {
        console.error('[SOCKET] Error handling send-message:', err);
        socket.emit('message-error', { error: 'Failed to process message' });
      }
    });

    // --- WebRTC Signaling ---
    socket.on('call-user', (data: {
      coupleId: string;
      recipientId: string;
      offer: any;
      callType: 'voice' | 'video';
    }) => {
      const targetSockets = activeConnections.get(data.recipientId) || [];
      targetSockets.forEach((sId) => {
        io.to(sId).emit('incoming-call', {
          callerId: userId,
          offer: data.offer,
          callType: data.callType
        });
      });
    });

    socket.on('call-accepted', (data: {
      coupleId: string;
      callerId: string;
      answer: any;
    }) => {
      const targetSockets = activeConnections.get(data.callerId) || [];
      targetSockets.forEach((sId) => {
        io.to(sId).emit('call-answered', {
          answer: data.answer
        });
      });
    });

    socket.on('call-declined', (data: { coupleId: string; callerId: string }) => {
      const targetSockets = activeConnections.get(data.callerId) || [];
      targetSockets.forEach((sId) => {
        io.to(sId).emit('call-rejected');
      });
    });

    socket.on('ice-candidate', (data: {
      coupleId: string;
      recipientId: string;
      candidate: any;
    }) => {
      const targetSockets = activeConnections.get(data.recipientId) || [];
      targetSockets.forEach((sId) => {
        io.to(sId).emit('ice-candidate', {
          candidate: data.candidate
        });
      });
    });

    socket.on('hang-up', (data: { coupleId: string; recipientId: string }) => {
      const targetSockets = activeConnections.get(data.recipientId) || [];
      targetSockets.forEach((sId) => {
        io.to(sId).emit('call-ended');
      });
    });

    // --- Disconnect ---
    socket.on('disconnect', async () => {
      console.log(`[SOCKET] User disconnected: ${userId} (Socket: ${socket.id})`);
      
      const userSockets = activeConnections.get(userId) || [];
      const updatedSockets = userSockets.filter((id) => id !== socket.id);
      
      if (updatedSockets.length === 0) {
        activeConnections.delete(userId);
        
        // User is completely offline
        if (user && user.coupleId) {
          const coupleIdStr = user.coupleId.toString();
          socket.to(`couple_${coupleIdStr}`).emit('presence-change', {
            userId,
            status: 'offline',
            lastSeen: new Date()
          });

          // Save last active on disconnect
          await User.findByIdAndUpdate(userId, { lastActive: new Date() });
        }
      } else {
        activeConnections.set(userId, updatedSockets);
      }
    });
  });
};
