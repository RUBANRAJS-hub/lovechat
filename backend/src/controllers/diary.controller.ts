import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import SharedDiary from '../models/SharedDiary';
import Couple from '../models/Couple';

export const getDiaryEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to see diaries' });
      return;
    }

    // Return entries that:
    // 1. Belong to this couple
    // 2. AND (are NOT private OR are authored by the current user)
    const entries = await SharedDiary.find({
      coupleId: user.coupleId,
      $or: [
        { isPrivate: false },
        { authorId: user._id }
      ]
    }).sort({ date: -1 });

    res.status(200).json(entries);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving diary entries' });
  }
};

export const createDiaryEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to write in the diary' });
      return;
    }

    const { content, mood, isPrivate, date } = req.body;
    if (!content || !mood) {
      res.status(400).json({ message: 'Content and mood are required' });
      return;
    }

    const entry = new SharedDiary({
      coupleId: user.coupleId,
      authorId: user._id,
      content,
      mood,
      isPrivate: !!isPrivate,
      date: date ? new Date(date) : new Date()
    });

    await entry.save();

    // Reward Gamification XP
    await Couple.findByIdAndUpdate(user.coupleId, { $inc: { xp: 10 } }); // 10 XP for writing in diary

    res.status(201).json(entry);
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating diary entry' });
  }
};

export const deleteDiaryEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Only creator can delete their entry
    const entry = await SharedDiary.findOneAndDelete({ _id: id, authorId: user._id });
    if (!entry) {
      res.status(404).json({ message: 'Entry not found or you are not the author' });
      return;
    }

    res.status(200).json({ message: 'Diary entry deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting diary entry' });
  }
};
