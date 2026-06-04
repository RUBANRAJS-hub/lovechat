import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import SharedGoal from '../models/SharedGoal';
import Couple from '../models/Couple';

export const getGoals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to see goals' });
      return;
    }

    const goals = await SharedGoal.find({ coupleId: user.coupleId }).sort({ createdAt: -1 });
    res.status(200).json(goals);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching goals' });
  }
};

export const createGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.coupleId) {
      res.status(400).json({ message: 'You must be paired to add goals' });
      return;
    }

    const { title, description, category, targetValue } = req.body;
    if (!title || !targetValue) {
      res.status(400).json({ message: 'Title and target value are required' });
      return;
    }

    const goal = new SharedGoal({
      coupleId: user.coupleId,
      title,
      description,
      category: category || 'custom',
      targetValue: Number(targetValue),
      currentValue: 0,
      status: 'active',
      createdBy: user._id
    });

    await goal.save();
    res.status(201).json(goal);
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding goal' });
  }
};

export const updateGoalProgress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { value } = req.body; // absolute value or increment

    if (value === undefined) {
      res.status(400).json({ message: 'Progress value is required' });
      return;
    }

    const goal = await SharedGoal.findOne({ _id: id, coupleId: user.coupleId });
    if (!goal) {
      res.status(404).json({ message: 'Goal not found' });
      return;
    }

    goal.currentValue = Number(value);
    
    if (goal.currentValue >= goal.targetValue) {
      goal.currentValue = goal.targetValue;
      
      if (goal.status !== 'completed') {
        goal.status = 'completed';
        goal.rewardBadge = `${goal.category.toUpperCase()}_CHAMPION`;

        // Award Gamification XP for completing goal!
        await Couple.findByIdAndUpdate(user.coupleId, { $inc: { xp: 50 } }); // 50 XP for completed goal
      }
    } else {
      goal.status = 'active';
    }

    await goal.save();
    res.status(200).json(goal);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating goal progress' });
  }
};

export const deleteGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const goal = await SharedGoal.findOneAndDelete({ _id: id, coupleId: user.coupleId });
    if (!goal) {
      res.status(404).json({ message: 'Goal not found' });
      return;
    }

    res.status(200).json({ message: 'Goal deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting goal' });
  }
};
