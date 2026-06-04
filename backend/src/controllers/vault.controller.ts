import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Memory from '../models/Memory';
import Couple from '../models/Couple';
import { uploadMedia } from '../services/cloudinary.service';

export const getMemories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to access the memory vault' });
      return;
    }

    const { category, search, tag } = req.query;
    const query: any = { coupleId: user.coupleId };

    if (category) {
      query.category = category;
    }
    if (tag) {
      query.tags = tag;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } }
      ];
    }

    const memories = await Memory.find(query).sort({ date: -1 });
    res.status(200).json(memories);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving memories' });
  }
};

export const createMemory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to upload memories' });
      return;
    }

    const { title, description, category, date, tags } = req.body;
    if (!title) {
      res.status(400).json({ message: 'Memory title is required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'Media file is required' });
      return;
    }

    let mediaType: 'image' | 'video' | 'audio' = 'image';
    if (req.file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    } else if (req.file.mimetype.startsWith('audio/') || req.file.originalname.endsWith('.m4a') || req.file.originalname.endsWith('.mp3')) {
      mediaType = 'audio';
    }

    const mediaUrl = await uploadMedia(
      req.file.buffer,
      'vault',
      req.file.originalname,
      req.file.mimetype
    );

    // Parse tags from string array if needed
    let parsedTags: string[] = [];
    if (tags) {
      if (typeof tags === 'string') {
        parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      } else if (Array.isArray(tags)) {
        parsedTags = tags;
      }
    }

    const memory = new Memory({
      coupleId: user.coupleId,
      title,
      description,
      mediaUrl,
      mediaType,
      category: category || 'normal',
      date: date ? new Date(date) : new Date(),
      tags: parsedTags
    });

    await memory.save();

    // Reward Gamification XP
    await Couple.findByIdAndUpdate(user.coupleId, { $inc: { xp: 15 } }); // 15 XP for creating memories

    res.status(201).json(memory);
  } catch (error: any) {
    console.error('Error creating memory:', error);
    res.status(500).json({ message: 'Error adding memory to vault' });
  }
};

export const deleteMemory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const memory = await Memory.findOneAndDelete({ _id: id, coupleId: user.coupleId });
    if (!memory) {
      res.status(404).json({ message: 'Memory not found' });
      return;
    }

    res.status(200).json({ message: 'Memory deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting memory' });
  }
};

export const getAlbums = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to fetch albums' });
      return;
    }

    // Retrieve unique tags as "albums"
    const tagsAggregation = await Memory.aggregate([
      { $match: { coupleId: user.coupleId } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          coverImage: { $first: '$mediaUrl' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Format for client
    const albums = tagsAggregation.map((a) => ({
      name: a._id,
      count: a.count,
      coverImage: a.coverImage
    }));

    res.status(200).json(albums);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching albums' });
  }
};
