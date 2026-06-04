import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Couple from '../models/Couple';
import { AuthRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'foreverus_secure_jwt_secret_key_2026';

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existingUser) {
      res.status(400).json({ message: 'Username or Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = new User({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      otp,
      otpExpiresAt,
      isVerified: false,
    });

    await user.save();

    // Log OTP for easy developer access
    console.log(`[AUTH] OTP for ${user.email} is ${otp}`);

    res.status(201).json({
      message: 'Registration successful. Verification OTP sent to email.',
      email: user.email,
      // For development ease, send OTP in response so users can test immediately
      dev_otp: otp,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error creating user' });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP are required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Account verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Verification failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      res.status(400).json({ message: 'Credentials and password are required' });
      return;
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() }
      ]
    });

    if (!user || !user.password) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    if (!user.isVerified) {
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      console.log(`[AUTH] Resent OTP for ${user.email} is ${otp}`);
      res.status(203).json({
        message: 'Email not verified. OTP sent.',
        email: user.email,
        dev_otp: otp
      });
      return;
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        partnerId: user.partnerId,
        coupleId: user.coupleId,
        publicKey: user.publicKey,
        hasKeys: !!user.publicKey
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Login failed' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: 'No account with that email' });
      return;
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    console.log(`[AUTH] Forgot password OTP for ${user.email} is ${otp}`);
    res.status(200).json({
      message: 'Password reset OTP sent',
      email: user.email,
      dev_otp: otp
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error handling forgot password' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.otp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      res.status(400).json({ message: 'Invalid or expired OTP' });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { name, bio, profilePhoto } = req.body;

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        partnerId: user.partnerId,
        coupleId: user.coupleId,
        publicKey: user.publicKey,
        hasKeys: !!user.publicKey
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating profile' });
  }
};

export const saveKeys = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { publicKey, encryptedPrivateKey, privateKeySalt } = req.body;

    if (!publicKey || !encryptedPrivateKey || !privateKeySalt) {
      res.status(400).json({ message: 'Public key, private key, and salt are required' });
      return;
    }

    user.publicKey = publicKey;
    user.encryptedPrivateKey = encryptedPrivateKey;
    user.privateKeySalt = privateKeySalt;
    await user.save();

    res.status(200).json({
      message: 'E2EE Keys successfully stored on server',
      publicKey: user.publicKey
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error saving keys' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let partnerInfo = null;
    let coupleInfo = null;

    if (user.partnerId) {
      const partner = await User.findById(user.partnerId).select('name username email profilePhoto bio publicKey lastActive');
      if (partner) {
        partnerInfo = {
          id: partner._id,
          name: partner.name,
          username: partner.username,
          email: partner.email,
          profilePhoto: partner.profilePhoto,
          bio: partner.bio,
          publicKey: partner.publicKey,
          lastActive: partner.lastActive
        };
      }
    }

    if (user.coupleId) {
      coupleInfo = await Couple.findById(user.coupleId);
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        partnerId: user.partnerId,
        coupleId: user.coupleId,
        publicKey: user.publicKey,
        encryptedPrivateKey: user.encryptedPrivateKey,
        privateKeySalt: user.privateKeySalt,
        hasKeys: !!user.publicKey
      },
      partner: partnerInfo,
      couple: coupleInfo
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};
