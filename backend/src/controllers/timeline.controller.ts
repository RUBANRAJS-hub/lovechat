import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import TimelineEvent from '../models/TimelineEvent';
import Couple from '../models/Couple';

export const getTimelineEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to access the timeline' });
      return;
    }

    const events = await TimelineEvent.find({ coupleId: user.coupleId }).sort({ date: 1 });
    res.status(200).json(events);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching timeline events' });
  }
};

export const createTimelineEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to create timeline milestones' });
      return;
    }

    const { title, description, date, category, mediaUrl } = req.body;

    if (!title || !date) {
      res.status(400).json({ message: 'Title and date are required' });
      return;
    }

    const event = new TimelineEvent({
      coupleId: user.coupleId,
      title,
      description,
      date: new Date(date),
      category: category || 'other',
      mediaUrl
    });

    await event.save();

    // If milestone is anniversary, update couple anniversary date
    if (category === 'anniversary') {
      await Couple.findByIdAndUpdate(user.coupleId, { anniversaryDate: new Date(date) });
    }

    // Award Gamification XP
    await Couple.findByIdAndUpdate(user.coupleId, { $inc: { xp: 10 } }); // 10 XP for milestone

    res.status(201).json(event);
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding event to timeline' });
  }
};

export const deleteTimelineEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const event = await TimelineEvent.findOneAndDelete({ _id: id, coupleId: user.coupleId });
    if (!event) {
      res.status(404).json({ message: 'Milestone event not found' });
      return;
    }

    res.status(200).json({ message: 'Milestone event deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting milestone event' });
  }
};
