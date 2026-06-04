import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Message from '../models/Message';
import { uploadMedia } from '../services/cloudinary.service';

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to access chat' });
      return;
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    const query: any = {
      coupleId: user.coupleId,
      isDeletedFor: { $ne: user._id } // Don't return messages deleted by this user for themselves
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('replyTo', 'encryptedContent iv encryptedKeySender encryptedKeyRecipient senderId mediaUrl mediaType');

    // Return in chronological order
    res.status(200).json(messages.reverse());
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving messages' });
  }
};

export const uploadAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to upload media' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Determine category based on mimetype
    let mediaType: 'image' | 'video' | 'voice' | 'document' = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    } else if (req.file.mimetype.startsWith('audio/') || req.file.originalname.endsWith('.m4a') || req.file.originalname.endsWith('.mp3') || req.file.originalname.endsWith('.wav')) {
      mediaType = 'voice';
    }

    const mediaUrl = await uploadMedia(
      req.file.buffer,
      'chat',
      req.file.originalname,
      req.file.mimetype
    );

    res.status(200).json({
      mediaUrl,
      mediaType
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Media upload failed' });
  }
};

export const editMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { encryptedContent, iv, encryptedKeySender, encryptedKeyRecipient } = req.body;

    const message = await Message.findOne({ _id: id, senderId: user._id });
    if (!message) {
      res.status(404).json({ message: 'Message not found or you are not the sender' });
      return;
    }

    if (message.isDeleted) {
      res.status(400).json({ message: 'Cannot edit deleted message' });
      return;
    }

    message.encryptedContent = encryptedContent;
    message.iv = iv;
    message.encryptedKeySender = encryptedKeySender;
    message.encryptedKeyRecipient = encryptedKeyRecipient;
    message.isEdited = true;

    await message.save();
    res.status(200).json(message);
  } catch (error: any) {
    res.status(500).json({ message: 'Error editing message' });
  }
};

export const deleteMessageForEveryone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const message = await Message.findOne({ _id: id, senderId: user._id });
    if (!message) {
      res.status(404).json({ message: 'Message not found or you are not the sender' });
      return;
    }

    message.isDeleted = true;
    // Replace content with static deleted text indicator (not decrypted, just generic text)
    message.encryptedContent = 'Message deleted'; 
    message.mediaUrl = undefined;
    message.mediaType = 'text';
    await message.save();

    res.status(200).json(message);
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting message' });
  }
};

export const deleteMessageForMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    if (!message.isDeletedFor.includes(user._id as any)) {
      message.isDeletedFor.push(user._id as any);
      await message.save();
    }

    res.status(200).json({ message: 'Message deleted for you' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting message' });
  }
};

export const togglePinMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const message = await Message.findOne({ _id: id, coupleId: user.coupleId });
    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    message.isPinned = !message.isPinned;
    await message.save();

    res.status(200).json(message);
  } catch (error: any) {
    res.status(500).json({ message: 'Error pinning message' });
  }
};
