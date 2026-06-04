import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import SharedDiary from '../models/SharedDiary';
import User from '../models/User';
import {
  getRelationshipAdvice as askGeminiAdvice,
  getDateSuggestions as askGeminiDates,
  getGiftRecommendations as askGeminiGifts,
  generateConversationStarters as askGeminiStarters,
  analyzeMoodAndRelationship as askGeminiAnalysis,
} from '../services/ai.service';

export const chatWithAdvisor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { history, message } = req.body; // history: { role: 'user'|'model', content: string }[]

    if (!message) {
      res.status(400).json({ message: 'Message is required' });
      return;
    }

    const advice = await askGeminiAdvice(history || [], message);
    res.status(200).json({ reply: advice });
  } catch (error) {
    res.status(500).json({ message: 'Error communicating with AI Advisor' });
  }
};

export const getPlanDates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { location, budget, mood, interests } = req.query;

    const suggestions = await askGeminiDates(
      (location as string) || 'Cosy at home',
      (budget as string) || 'Medium',
      (mood as string) || 'Romantic',
      (interests as string) || 'Art, Food, Movies'
    );

    res.status(200).json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: 'Error planning dates' });
  }
};

export const getGiftIdeas = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { occasion, interests, budget } = req.query;

    const suggestions = await askGeminiGifts(
      (occasion as string) || 'Anniversary',
      (interests as string) || 'Technology, Music',
      (budget as string) || 'Medium'
    );

    res.status(200).json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: 'Error getting gift ideas' });
  }
};

export const getConversationStarters = async (req: Request, res: Response): Promise<void> => {
  try {
    const starters = await askGeminiStarters();
    res.status(200).json(starters);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversation starters' });
  }
};

export const getRelationshipDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to view relationship analysis' });
      return;
    }

    // Retrieve last 7 days of diary entries for both partners
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch entries
    const diaries = await SharedDiary.find({
      coupleId: user.coupleId,
      date: { $gte: oneWeekAgo }
    }).populate('authorId', 'name');

    // Format diaries for AI analyzer
    const formattedDiaries = diaries.map((d) => ({
      content: d.content,
      mood: d.mood,
      authorName: (d.authorId as any).name || 'Partner'
    }));

    const analysis = await askGeminiAnalysis(formattedDiaries);
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error generating relationship dashboard:', error);
    res.status(500).json({ message: 'Error generating AI Relationship dashboard' });
  }
};
