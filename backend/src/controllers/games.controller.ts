import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import GameSession from '../models/GameSession';
import Couple from '../models/Couple';

// Pre-defined Questions Database
const TRUTH_PROMPTS = [
  "What was your first impression of me, and how has it changed?",
  "What is a secret dream or ambition you haven't shared with me yet?",
  "When did you first realize you were falling in love with me?",
  "If you could change one thing about our relationship, what would it be?",
  "What is your favorite memory of us spending quality time together?",
  "What is something I do that instantly puts you in a good mood?",
  "What is your biggest fear when it comes to our future?"
];

const DARE_PROMPTS = [
  "Give me a 5-minute foot or back massage right now.",
  "Whisper a sweet or romantic secret in my ear.",
  "Slow dance with me for 2 minutes with no music.",
  "Look into my eyes for 1 full minute without laughing or speaking.",
  "Write a short, spontaneous 4-line love poem for me.",
  "Text me the most romantic thing you can think of from across the room.",
  "Mimic my worst habit in a funny, loving way."
];

const SPIN_WHEEL_TASKS = [
  "Cook partner's favorite meal this week",
  "Give partner a 10-minute massage",
  "Plan the next weekend date completely by yourself",
  "Give partner 3 genuine compliments right now",
  "Sing a love song to your partner",
  "Buy partner a small surprise treat today",
  "Do the dishes/cleaning tonight",
  "Hold hands for the next 30 minutes"
];

// Love Language Questions (shortened for implementation ease, fully functional)
// Categories: Words of Affirmation (A), Quality Time (B), Receiving Gifts (C), Acts of Service (D), Physical Touch (E)
const LOVE_LANGUAGE_QUESTIONS = [
  { id: 1, text: "I feel loved when my partner says sweet things to me.", category: "A" },
  { id: 2, text: "I feel loved when we spend uninterrupted time together.", category: "B" },
  { id: 3, text: "I feel loved when my partner gives me small gifts.", category: "C" },
  { id: 4, text: "I feel loved when my partner helps me with chores.", category: "D" },
  { id: 5, text: "I feel loved when my partner holds my hand or hugs me.", category: "E" },
  { id: 6, text: "I love hearing 'I appreciate you' from my partner.", category: "A" },
  { id: 7, text: "Taking a trip or walking together makes me feel closest.", category: "B" },
  { id: 8, text: "I cherish visual tokens of affection like flowers or notes.", category: "C" },
  { id: 9, text: "When my partner fixes something for me, I feel valued.", category: "D" },
  { id: 10, text: "Snuggling on the couch is my ultimate comfort.", category: "E" }
];

export const getTruthOrDare = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = req.query.category || 'truth';
    const prompts = category === 'truth' ? TRUTH_PROMPTS : DARE_PROMPTS;
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    res.status(200).json({
      category,
      prompt: randomPrompt
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving truth or dare prompt' });
  }
};

export const getSpinWheelTasks = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(SPIN_WHEEL_TASKS);
};

export const submitSpinResult = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { task } = req.body;

    if (!task) {
      res.status(400).json({ message: 'Task is required' });
      return;
    }

    const session = new GameSession({
      coupleId: user.coupleId,
      gameType: 'spin-wheel',
      status: 'completed',
      results: {
        winner: user.name,
        task: task
      }
    });

    await session.save();

    // Reward XP
    await Couple.findByIdAndUpdate(user.coupleId, { $inc: { xp: 10 } });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error recording spin result' });
  }
};

export const submitLoveLanguage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { scores } = req.body; // Map of category (A, B, C, D, E) to score values (1 to 5)

    if (!scores) {
      res.status(400).json({ message: 'Scores are required' });
      return;
    }

    // Scores example: { A: 8, B: 10, C: 4, D: 6, E: 2 }
    const session = new GameSession({
      coupleId: user.coupleId,
      gameType: 'love-language',
      status: 'completed',
      gameState: { userId: user._id },
      results: {
        userId: user._id,
        userName: user.name,
        scores: scores
      }
    });

    await session.save();

    // Reward XP
    await Couple.findByIdAndUpdate(user.coupleId, { $inc: { xp: 20 } });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Error saving love language results' });
  }
};

export const getLoveLanguageQuestions = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(LOVE_LANGUAGE_QUESTIONS);
};

export const submitQuizAnswers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { quizId, answers } = req.body; // answers: Record<string, string> (e.g., question ID to answer text)

    if (!quizId || !answers) {
      res.status(400).json({ message: 'QuizId and answers are required' });
      return;
    }

    // Check if there is an active pending quiz session for this couple
    let session = await GameSession.findOne({
      coupleId: user.coupleId,
      gameType: 'quiz',
      status: 'pending',
      'gameState.quizId': quizId
    });

    if (!session) {
      // First player to submit
      session = new GameSession({
        coupleId: user.coupleId,
        gameType: 'quiz',
        status: 'pending',
        gameState: {
          quizId,
          player1Id: user._id,
          player1Name: user.name,
          player1Answers: answers
        }
      });
      await session.save();

      res.status(200).json({
        message: 'Your answers have been saved! Waiting for your partner to complete the quiz.',
        session
      });
      return;
    }

    // Second player submitting
    const gameState = session.gameState;
    if (gameState.player1Id.toString() === user._id.toString()) {
      res.status(400).json({ message: 'You have already submitted answers for this quiz' });
      return;
    }

    const p1Answers = gameState.player1Answers as Record<string, string>;
    const p2Answers = answers as Record<string, string>;
    
    let totalQuestions = 0;
    let matchingAnswers = 0;

    const keys = Object.keys(p1Answers).filter(k => k !== '__proto__' && k !== 'constructor' && k !== 'prototype');
    for (const key of keys) {
      totalQuestions++;
      // Simple match check
      const val1 = Reflect.get(p1Answers, key);
      const val2 = Reflect.get(p2Answers, key);
      if (val2 && typeof val1 === 'string' && typeof val2 === 'string' && val1.trim().toLowerCase() === val2.trim().toLowerCase()) {
        matchingAnswers++;
      }
    }

    const matchPercentage = totalQuestions > 0 ? Math.round((matchingAnswers / totalQuestions) * 100) : 100;

    session.status = 'completed';
    session.gameState = {
      ...gameState,
      player2Id: user._id,
      player2Name: user.name,
      player2Answers: answers
    };
    session.results = {
      matchPercentage,
      player1Name: gameState.player1Name,
      player2Name: user.name,
      scoreText: `${matchingAnswers}/${totalQuestions} matches`
    };

    await session.save();

    // Reward XP to the couple
    const xpReward = 30 + (matchPercentage >= 70 ? 20 : 0); // extra 20 XP for high compatibility
    await Couple.findByIdAndUpdate(user.coupleId, { $inc: { xp: xpReward } });

    res.status(200).json({
      message: 'Quiz completed!',
      results: session.results,
      session
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting quiz answers' });
  }
};

export const getGameHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to see games history' });
      return;
    }

    const history = await GameSession.find({ coupleId: user.coupleId }).sort({ createdAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving game history' });
  }
};
