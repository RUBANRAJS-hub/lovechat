import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import Couple from '../models/Couple';

// Generate random 6-character alphanumeric code
const generateRandomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generatePairCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    
    if (user.partnerId) {
      res.status(400).json({ message: 'You are already paired with someone' });
      return;
    }

    const code = generateRandomCode();
    user.pairingCode = code;
    user.pairingCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
    await user.save();

    res.status(200).json({
      message: 'Pairing code generated',
      pairingCode: code,
      expiresAt: user.pairingCodeExpiresAt
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error generating pairing code' });
  }
};

export const pairWithCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUser = req.user!;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ message: 'Pairing code is required' });
      return;
    }

    if (currentUser.partnerId) {
      res.status(400).json({ message: 'You are already paired' });
      return;
    }

    // Find the partner who owns this active code
    const partner = await User.findOne({
      pairingCode: code.toUpperCase(),
      pairingCodeExpiresAt: { $gt: new Date() }
    });

    if (!partner) {
      res.status(404).json({ message: 'Invalid or expired pairing code' });
      return;
    }

    if (partner._id.toString() === currentUser._id.toString()) {
      res.status(400).json({ message: 'You cannot pair with yourself' });
      return;
    }

    if (partner.partnerId) {
      res.status(400).json({ message: 'This user is already paired with someone else' });
      return;
    }

    // Create Couple document
    const newCouple = new Couple({
      userIds: [currentUser._id, partner._id],
      anniversaryDate: new Date() // default to today, user can adjust later
    });
    await newCouple.save();

    // Link users
    currentUser.partnerId = partner._id;
    currentUser.coupleId = newCouple._id;
    currentUser.pairingCode = undefined;
    currentUser.pairingCodeExpiresAt = undefined;
    await currentUser.save();

    partner.partnerId = currentUser._id;
    partner.coupleId = newCouple._id;
    partner.pairingCode = undefined;
    partner.pairingCodeExpiresAt = undefined;
    await partner.save();

    res.status(200).json({
      message: 'Successfully paired!',
      couple: newCouple,
      partner: {
        id: partner._id,
        name: partner.name,
        username: partner.username,
        email: partner.email,
        profilePhoto: partner.profilePhoto,
        publicKey: partner.publicKey
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error establishing pairing' });
  }
};

export const unpair = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (!user.partnerId || !user.coupleId) {
      res.status(400).json({ message: 'You are not paired' });
      return;
    }

    const partnerId = user.partnerId;
    const coupleId = user.coupleId;

    // Remove link on both users
    user.partnerId = undefined;
    user.coupleId = undefined;
    await user.save();

    const partner = await User.findById(partnerId);
    if (partner) {
      partner.partnerId = undefined;
      partner.coupleId = undefined;
      await partner.save();
    }

    // Remove couple document
    await Couple.findByIdAndDelete(coupleId);

    res.status(200).json({ message: 'Successfully unpaired. All couple data reset.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error removing pair connection' });
  }
};
